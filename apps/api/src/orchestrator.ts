import type { Database } from "bun:sqlite";
import {
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_RUNNING,
  JOB_STATUS_WAITING,
  JobInputSchema,
  JobViewSchema,
  MIN_TEXT_LENGTH,
  QUESTION_STATUS_QUEUED,
  SPACE,
  TASK_KIND_PO,
  TASK_KIND_SO,
  TASK_KIND_STOCK,
  TASK_STATUS_DONE,
  TASK_STATUS_FAILED,
  TASK_STATUS_PAUSED,
  TASK_STATUS_RUNNING,
  type AgentResultIds,
  type JobInput,
  type JobView,
  type MemoryEntry,
  type TaskKind,
} from "shared";
import {
  answerQuestionRow,
  findCompletedOutput,
  findJobRow,
  findMemoryAnswer,
  findQuestionRow,
  findQuestionRows,
  findTaskRows,
  insertJob,
  insertQuestion,
  insertTask,
  listMemoryRows,
  updateJobResultIds,
  updateJobStatus,
  updateTask,
  upsertMemory,
} from "./db";
import { logger } from "./logger";

export const EVENT_STARTED = "started" as const;
export const EVENT_PO_COMPLETED = "po_completed" as const;
export const EVENT_PO_REUSED = "po_reused" as const;
export const EVENT_SO_COMPLETED = "so_completed" as const;
export const EVENT_SO_REUSED = "so_reused" as const;
export const EVENT_STOCK_COMPLETED = "stock_completed" as const;
export const EVENT_STOCK_REUSED = "stock_reused" as const;
export const EVENT_WAITING = "waiting" as const;
export const EVENT_MEMORY_HIT = "memory_hit" as const;
export const EVENT_COMPLETED = "completed" as const;
export const EVENT_FAILED = "failed" as const;

export type JobEventType =
  | typeof EVENT_STARTED
  | typeof EVENT_PO_COMPLETED
  | typeof EVENT_PO_REUSED
  | typeof EVENT_SO_COMPLETED
  | typeof EVENT_SO_REUSED
  | typeof EVENT_STOCK_COMPLETED
  | typeof EVENT_STOCK_REUSED
  | typeof EVENT_WAITING
  | typeof EVENT_MEMORY_HIT
  | typeof EVENT_COMPLETED
  | typeof EVENT_FAILED;

export type JobEvent = {
  type: JobEventType;
  jobId: string;
  taskId?: string;
  orderId?: string;
  reason?: string;
};

export const STEP_OK = "ok" as const;
export const STEP_NEEDS_INPUT = "needs_input" as const;
const STEP_FAILED = "failed" as const;

export type AgentStepResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string };

export type QaPair = {
  question: string;
  answer: string;
};

export type StepAttemptResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string }
  | { status: typeof STEP_FAILED };

export type AgentPort = {
  runPurchaseOrder: (input: { goal: string }) => Promise<AgentStepResult>;
  runSalesOrder: (input: { goal: string; purchaseOrderId: string }) => Promise<AgentStepResult>;
  runStockEntry: (input: {
    goal: string;
    purchaseOrderId: string;
    salesOrderId: string;
  }) => Promise<AgentStepResult>;
};

export type OrchestratorDeps = {
  db: Database;
  agent: AgentPort;
  onEvent?: (event: JobEvent) => void;
};

export type AnswerInput = {
  jobId: string;
  questionId: string;
  answer: string;
};

const GOAL_ON = "On" as const;
const GOAL_PURCHASE_ORDER_PATH = "/app/purchase-order" as const;
const GOAL_SALES_ORDER_PATH = "/app/sales-order" as const;
const GOAL_STOCK_ENTRY_PATH = "/app/stock-entry" as const;
const GOAL_SEARCH_PO = "Search existing Purchase Order by" as const;
const GOAL_SEARCH_SO = "Search existing Sales Order by" as const;
const GOAL_SEARCH_STOCK = "Search existing Stock Entry by" as const;
export const GOAL_IF_FOUND = "If found, return its ID and do not create." as const;
const GOAL_ELSE_CREATE_PO = "Else create Purchase Order for supplier" as const;
const GOAL_ELSE_CREATE_SO = "Else create Sales Order with items" as const;
const GOAL_ELSE_CREATE_STOCK = "Else create Stock Entry material transfer with items" as const;
const GOAL_WITH_ITEMS = "with items" as const;
const GOAL_FOLLOWING_INSTRUCTION = "following instruction" as const;
const GOAL_BASED_ON_PO = "based on purchase order" as const;
const GOAL_BASED_ON_SO = "and sales order" as const;
const GOAL_DROPDOWNS =
  "Wait explicitly for slow dynamic dropdown options; retry up to 3 times." as const;
const GOAL_RETURN_PO = "Return JSON {purchase_order_id}." as const;
const GOAL_RETURN_SO = "Return JSON {sales_order_id}." as const;
const GOAL_RETURN_STOCK = "Return JSON {stock_entry_id}." as const;
const GOAL_LEARNED_PREFIX = "Learned answers:" as const;
const GOAL_QA_Q = "Q:" as const;
const GOAL_QA_A = "A:" as const;
const INVOICE_NO_KEY = "invoice_no" as const;
const SUPPLIER_KEY = "supplier" as const;
const NEWLINE = "\n" as const;
const EQUALS = "=" as const;
const PLUS = "+" as const;
const EMPTY_LEARNED = "" as const;
const JOB_LOG_MESSAGE = "job_transition" as const;
const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;
const ANSWER_TARGET_MESSAGE = "answer_target_not_queued" as const;
const INVALID_ANSWER_MESSAGE = "answer_must_not_be_blank" as const;
const RESUME_STATE_MESSAGE = "resume_state_missing_prior_id" as const;

const STEP_ORDER: readonly TaskKind[] = [TASK_KIND_PO, TASK_KIND_SO, TASK_KIND_STOCK];

type ChainStep =
  | { finished: false; orderId: string }
  | { finished: true; status: typeof JOB_STATUS_WAITING | typeof JOB_STATUS_FAILED };

function formatQa(question: string, answer: string): string {
  return [GOAL_QA_Q, question, GOAL_QA_A, answer].join(SPACE);
}

export function listMemory(db: Database, erpHost: string): MemoryEntry[] {
  return listMemoryRows(db, erpHost);
}

export function getLearnedContext(db: Database, erpHost: string): string {
  const entries: MemoryEntry[] = listMemory(db, erpHost);
  if (entries.length === 0) {
    return EMPTY_LEARNED;
  }
  return entries.map((entry) => formatQa(entry.q_norm, entry.answer)).join(NEWLINE);
}

function withQa(goal: string, qa: QaPair | undefined): string {
  if (qa === undefined) {
    return goal;
  }
  return [goal, formatQa(qa.question, qa.answer)].join(NEWLINE);
}

function buildWhere(input: JobInput): string {
  return [
    INVOICE_NO_KEY,
    EQUALS,
    input.invoice_json.invoice_no,
    PLUS,
    SUPPLIER_KEY,
    EQUALS,
    input.invoice_json.supplier,
  ].join(SPACE);
}

function buildGoal(
  input: JobInput,
  learned: string,
  args: {
    path: string;
    search: string;
    create: string;
    middle: string[];
    returnClause: string;
  },
): string {
  const body: string[] = [
    GOAL_ON,
    `${input.erp_host}${args.path}`,
    args.search,
    buildWhere(input),
    GOAL_IF_FOUND,
    args.create,
    ...args.middle,
    GOAL_FOLLOWING_INSTRUCTION,
    input.instruction,
    GOAL_DROPDOWNS,
    args.returnClause,
  ];
  if (learned === EMPTY_LEARNED) {
    return body.join(SPACE);
  }
  return [GOAL_LEARNED_PREFIX, learned, ...body].join(SPACE);
}

function buildPoGoal(input: JobInput, learned: string): string {
  return buildGoal(input, learned, {
    path: GOAL_PURCHASE_ORDER_PATH,
    search: GOAL_SEARCH_PO,
    create: GOAL_ELSE_CREATE_PO,
    middle: [input.invoice_json.supplier, GOAL_WITH_ITEMS, JSON.stringify(input.invoice_json.items)],
    returnClause: GOAL_RETURN_PO,
  });
}

function buildSoGoal(input: JobInput, learned: string, purchaseOrderId: string): string {
  return buildGoal(input, learned, {
    path: GOAL_SALES_ORDER_PATH,
    search: GOAL_SEARCH_SO,
    create: GOAL_ELSE_CREATE_SO,
    middle: [JSON.stringify(input.invoice_json.items), GOAL_BASED_ON_PO, purchaseOrderId],
    returnClause: GOAL_RETURN_SO,
  });
}

function buildStockGoal(
  input: JobInput,
  learned: string,
  purchaseOrderId: string,
  salesOrderId: string,
): string {
  return buildGoal(input, learned, {
    path: GOAL_STOCK_ENTRY_PATH,
    search: GOAL_SEARCH_STOCK,
    create: GOAL_ELSE_CREATE_STOCK,
    middle: [
      JSON.stringify(input.invoice_json.items),
      GOAL_BASED_ON_PO,
      purchaseOrderId,
      GOAL_BASED_ON_SO,
      salesOrderId,
    ],
    returnClause: GOAL_RETURN_STOCK,
  });
}

function toView(db: Database, jobId: string): JobView {
  const view = getJob(db, jobId);
  if (view === undefined) {
    throw new Error(JOB_NOT_FOUND_MESSAGE);
  }
  return view;
}

export function getJob(db: Database, jobId: string): JobView | undefined {
  const job = findJobRow(db, jobId);
  if (job === undefined) {
    return undefined;
  }
  const tasks = findTaskRows(db, jobId).map((task) => ({
    id: task.id,
    kind: task.kind,
    status: task.status,
    output_id: task.output_id,
  }));
  const questions = findQuestionRows(db, jobId).map((question) => ({
    id: question.id,
    q_raw: question.q_raw,
    q_norm: question.q_norm,
    status: question.status,
  }));
  return JobViewSchema.parse({
    id: job.id,
    status: job.status,
    result_ids: job.result_ids === null ? {} : JSON.parse(job.result_ids),
    tasks,
    questions,
  });
}

function mustId(value: string | undefined): string {
  if (value === undefined) {
    throw new Error(RESUME_STATE_MESSAGE);
  }
  return value;
}

function rebuildCollected(db: Database, jobId: string): AgentResultIds {
  const collected: AgentResultIds = {};
  for (const task of findTaskRows(db, jobId)) {
    if (task.status !== TASK_STATUS_DONE || task.output_id === null) {
      continue;
    }
    if (task.kind === TASK_KIND_PO) {
      collected.purchase_order_id = task.output_id;
    } else if (task.kind === TASK_KIND_SO) {
      collected.sales_order_id = task.output_id;
    } else {
      collected.stock_entry_id = task.output_id;
    }
  }
  return collected;
}

function pausedStep(db: Database, jobId: string): { index: number; taskId: string } | undefined {
  const paused = findTaskRows(db, jobId).find((task) => task.status === TASK_STATUS_PAUSED);
  if (paused === undefined) {
    return undefined;
  }
  return { index: STEP_ORDER.indexOf(paused.kind), taskId: paused.id };
}

type StepDef = {
  kind: TaskKind;
  completedEvent:
    | typeof EVENT_PO_COMPLETED
    | typeof EVENT_SO_COMPLETED
    | typeof EVENT_STOCK_COMPLETED;
  reusedEvent: typeof EVENT_PO_REUSED | typeof EVENT_SO_REUSED | typeof EVENT_STOCK_REUSED;
  run: (qa: QaPair | undefined) => Promise<AgentStepResult>;
};

export async function createJob(input: JobInput, deps: OrchestratorDeps): Promise<JobView> {
  const parsed: JobInput = JobInputSchema.parse(input);
  const emit = makeEmit(deps);
  const jobId: string = crypto.randomUUID();
  const createdAt: string = new Date().toISOString();
  insertJob(deps.db, {
    id: jobId,
    input: parsed,
    status: JOB_STATUS_RUNNING,
    createdAt,
  });
  emit({ type: EVENT_STARTED, jobId });
  const learned: string = getLearnedContext(deps.db, parsed.erp_host);
  return runStepsFrom(deps, parsed, learned, jobId, emit, {}, { index: 0, taskId: undefined });
}

export async function answerQuestion(
  input: AnswerInput,
  deps: OrchestratorDeps,
): Promise<JobView> {
  const trimmedAnswer: string = input.answer.trim();
  if (trimmedAnswer.length < MIN_TEXT_LENGTH) {
    throw new Error(INVALID_ANSWER_MESSAGE);
  }
  const question = findQuestionRow(deps.db, input.questionId);
  if (
    question === undefined ||
    question.job_id !== input.jobId ||
    question.status !== QUESTION_STATUS_QUEUED
  ) {
    throw new Error(ANSWER_TARGET_MESSAGE);
  }
  const job = findJobRow(deps.db, input.jobId);
  if (job === undefined) {
    throw new Error(JOB_NOT_FOUND_MESSAGE);
  }
  const parsed: JobInput = JobInputSchema.parse({
    invoice_json: JSON.parse(job.invoice_json),
    instruction: job.instruction,
    erp_host: job.erp_host,
    profile_id: job.profile_id,
  });
  upsertMemory(deps.db, {
    erpHost: job.erp_host,
    qNorm: question.q_norm,
    answer: trimmedAnswer,
    updatedAt: new Date().toISOString(),
  });
  answerQuestionRow(deps.db, input.questionId, trimmedAnswer);
  updateJobStatus(deps.db, input.jobId, JOB_STATUS_RUNNING);
  const emit = makeEmit(deps);
  const collected: AgentResultIds = rebuildCollected(deps.db, input.jobId);
  const learned: string = getLearnedContext(deps.db, job.erp_host);
  const resume = pausedStep(deps.db, input.jobId);
  if (resume === undefined || resume.index >= STEP_ORDER.length) {
    return toView(deps.db, input.jobId);
  }
  return runStepsFrom(deps, parsed, learned, input.jobId, emit, collected, {
    index: resume.index,
    taskId: resume.taskId,
  });
}

function makeEmit(deps: OrchestratorDeps): (event: JobEvent) => void {
  return (event: JobEvent): void => {
    logger.info(
      {
        jobId: event.jobId,
        taskId: event.taskId,
        type: event.type,
        orderId: event.orderId,
        reason: event.reason,
      },
      JOB_LOG_MESSAGE,
    );
    deps.onEvent?.(event);
  };
}

async function runStepsFrom(
  deps: OrchestratorDeps,
  parsed: JobInput,
  learned: string,
  jobId: string,
  emit: (event: JobEvent) => void,
  collected: AgentResultIds,
  resume: { index: number; taskId: string | undefined },
): Promise<JobView> {
  const defs: StepDef[] = [
    {
      kind: TASK_KIND_PO,
      completedEvent: EVENT_PO_COMPLETED,
      reusedEvent: EVENT_PO_REUSED,
      run: (qa: QaPair | undefined) =>
        deps.agent.runPurchaseOrder({ goal: withQa(buildPoGoal(parsed, learned), qa) }),
    },
    {
      kind: TASK_KIND_SO,
      completedEvent: EVENT_SO_COMPLETED,
      reusedEvent: EVENT_SO_REUSED,
      run: (qa: QaPair | undefined) =>
        deps.agent.runSalesOrder({
          goal: withQa(buildSoGoal(parsed, learned, mustId(collected.purchase_order_id)), qa),
          purchaseOrderId: mustId(collected.purchase_order_id),
        }),
    },
    {
      kind: TASK_KIND_STOCK,
      completedEvent: EVENT_STOCK_COMPLETED,
      reusedEvent: EVENT_STOCK_REUSED,
      run: (qa: QaPair | undefined) =>
        deps.agent.runStockEntry({
          goal: withQa(
            buildStockGoal(
              parsed,
              learned,
              mustId(collected.purchase_order_id),
              mustId(collected.sales_order_id),
            ),
            qa,
          ),
          purchaseOrderId: mustId(collected.purchase_order_id),
          salesOrderId: mustId(collected.sales_order_id),
        }),
    },
  ];

  try {
    let resumedTaskId: string | undefined = resume.taskId;
    for (const step of defs.slice(resume.index)) {
      const outcome: ChainStep = await runChainStep(
        deps,
        parsed,
        jobId,
        emit,
        step,
        resumedTaskId,
      );
      resumedTaskId = undefined;
      if (outcome.finished) {
        return haltJob(deps, jobId, collected, outcome.status, emit);
      }
      if (step.kind === TASK_KIND_PO) {
        collected.purchase_order_id = outcome.orderId;
      } else if (step.kind === TASK_KIND_SO) {
        collected.sales_order_id = outcome.orderId;
      } else {
        collected.stock_entry_id = outcome.orderId;
      }
    }
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateJobStatus(deps.db, jobId, JOB_STATUS_FAILED);
    emit({ type: EVENT_FAILED, jobId, reason });
    logger.error({ jobId, reason }, JOB_LOG_MESSAGE);
    return toView(deps.db, jobId);
  }

  updateJobResultIds(deps.db, jobId, collected);
  updateJobStatus(deps.db, jobId, JOB_STATUS_DONE);
  emit({ type: EVENT_COMPLETED, jobId });
  return toView(deps.db, jobId);
}

function haltJob(
  deps: OrchestratorDeps,
  jobId: string,
  collected: AgentResultIds,
  status: typeof JOB_STATUS_WAITING | typeof JOB_STATUS_FAILED,
  emit: (event: JobEvent) => void,
): JobView {
  updateJobResultIds(deps.db, jobId, collected);
  updateJobStatus(deps.db, jobId, status);
  return toView(deps.db, jobId);
}

async function runChainStep(
  deps: OrchestratorDeps,
  parsed: JobInput,
  jobId: string,
  emit: (event: JobEvent) => void,
  step: StepDef,
  resumedTaskId: string | undefined,
): Promise<ChainStep> {
  const reused: string | undefined = findCompletedOutput(
    deps.db,
    step.kind,
    parsed.invoice_json.invoice_no,
    parsed.invoice_json.supplier,
    parsed.erp_host,
  );
  if (reused !== undefined) {
    const reusedTaskId: string = crypto.randomUUID();
    insertTask(deps.db, {
      id: reusedTaskId,
      jobId,
      kind: step.kind,
      status: TASK_STATUS_DONE,
      outputId: reused,
    });
    emit({ type: step.reusedEvent, jobId, taskId: reusedTaskId, orderId: reused });
    return { finished: false, orderId: reused };
  }

  const taskId: string = resumedTaskId ?? crypto.randomUUID();
  if (resumedTaskId === undefined) {
    insertTask(deps.db, { id: taskId, jobId, kind: step.kind, status: TASK_STATUS_RUNNING });
  } else {
    updateTask(deps.db, taskId, TASK_STATUS_RUNNING, null);
  }

  const first: StepAttemptResult = await invokeStep(deps, jobId, taskId, emit, step, undefined);
  if (first.status === STEP_OK) {
    updateTask(deps.db, taskId, TASK_STATUS_DONE, first.orderId);
    emit({ type: step.completedEvent, jobId, taskId, orderId: first.orderId });
    return { finished: false, orderId: first.orderId };
  }
  if (first.status === STEP_FAILED) {
    return { finished: true, status: JOB_STATUS_FAILED };
  }

  const qNorm: string = first.question.toLowerCase().trim();
  const memorized: string | undefined = findMemoryAnswer(deps.db, parsed.erp_host, qNorm);
  let latest: string = first.question;
  if (memorized !== undefined) {
    emit({ type: EVENT_MEMORY_HIT, jobId, taskId });
    const retry: StepAttemptResult = await invokeStep(
      deps,
      jobId,
      taskId,
      emit,
      step,
      { question: first.question, answer: memorized },
    );
    if (retry.status === STEP_OK) {
      updateTask(deps.db, taskId, TASK_STATUS_DONE, retry.orderId);
      emit({ type: step.completedEvent, jobId, taskId, orderId: retry.orderId });
      return { finished: false, orderId: retry.orderId };
    }
    if (retry.status === STEP_FAILED) {
      return { finished: true, status: JOB_STATUS_FAILED };
    }
    latest = retry.question;
  }

  insertQuestion(deps.db, {
    id: crypto.randomUUID(),
    jobId,
    qNorm: latest.toLowerCase().trim(),
    qRaw: latest,
    status: QUESTION_STATUS_QUEUED,
  });
  updateTask(deps.db, taskId, TASK_STATUS_PAUSED, null);
  emit({ type: EVENT_WAITING, jobId, taskId, reason: latest });
  return { finished: true, status: JOB_STATUS_WAITING };
}

async function invokeStep(
  deps: OrchestratorDeps,
  jobId: string,
  taskId: string,
  emit: (event: JobEvent) => void,
  step: StepDef,
  qa: QaPair | undefined,
): Promise<StepAttemptResult> {
  try {
    return await step.run(qa);
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateTask(deps.db, taskId, TASK_STATUS_FAILED, null);
    emit({ type: EVENT_FAILED, jobId, taskId, reason });
    logger.error({ jobId, taskId, reason }, JOB_LOG_MESSAGE);
    return { status: STEP_FAILED };
  }
}
