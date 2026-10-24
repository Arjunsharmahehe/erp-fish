import type { Database } from "bun:sqlite";
import {
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_RUNNING,
  JOB_STATUS_WAITING,
  JobInputSchema,
  JobViewSchema,
  QUESTION_STATUS_QUEUED,
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
  type TaskKind,
} from "shared";
import {
  findCompletedOutput,
  findJobRow,
  findQuestionRows,
  findTaskRows,
  insertJob,
  insertQuestion,
  insertTask,
  updateJobResultIds,
  updateJobStatus,
  updateTask,
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

export type AgentStepResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string };

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
const INVOICE_NO_KEY = "invoice_no" as const;
const SUPPLIER_KEY = "supplier" as const;
const SPACE = " " as const;
const EQUALS = "=" as const;
const PLUS = "+" as const;
const JOB_LOG_MESSAGE = "job_transition" as const;
const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;

type ChainStep =
  | { finished: false; orderId: string }
  | { finished: true; status: typeof JOB_STATUS_WAITING | typeof JOB_STATUS_FAILED };

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
  args: {
    path: string;
    search: string;
    create: string;
    middle: string[];
    returnClause: string;
  },
): string {
  return [
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
  ].join(SPACE);
}

function buildPoGoal(input: JobInput): string {
  return buildGoal(input, {
    path: GOAL_PURCHASE_ORDER_PATH,
    search: GOAL_SEARCH_PO,
    create: GOAL_ELSE_CREATE_PO,
    middle: [input.invoice_json.supplier, GOAL_WITH_ITEMS, JSON.stringify(input.invoice_json.items)],
    returnClause: GOAL_RETURN_PO,
  });
}

function buildSoGoal(input: JobInput, purchaseOrderId: string): string {
  return buildGoal(input, {
    path: GOAL_SALES_ORDER_PATH,
    search: GOAL_SEARCH_SO,
    create: GOAL_ELSE_CREATE_SO,
    middle: [JSON.stringify(input.invoice_json.items), GOAL_BASED_ON_PO, purchaseOrderId],
    returnClause: GOAL_RETURN_SO,
  });
}

function buildStockGoal(input: JobInput, purchaseOrderId: string, salesOrderId: string): string {
  return buildGoal(input, {
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

type StepDef = {
  kind: TaskKind;
  completedEvent: typeof EVENT_PO_COMPLETED | typeof EVENT_SO_COMPLETED | typeof EVENT_STOCK_COMPLETED;
  reusedEvent: typeof EVENT_PO_REUSED | typeof EVENT_SO_REUSED | typeof EVENT_STOCK_REUSED;
  run: () => Promise<AgentStepResult>;
};

export async function createJob(input: JobInput, deps: OrchestratorDeps): Promise<JobView> {
  const parsed: JobInput = JobInputSchema.parse(input);
  const emit = (event: JobEvent): void => {
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
  const jobId: string = crypto.randomUUID();
  const createdAt: string = new Date().toISOString();
  insertJob(deps.db, {
    id: jobId,
    input: parsed,
    status: JOB_STATUS_RUNNING,
    createdAt,
  });
  emit({ type: EVENT_STARTED, jobId });

  const collected: AgentResultIds = {};
  const po = await runChainStep(deps, parsed, jobId, emit, {
    kind: TASK_KIND_PO,
    completedEvent: EVENT_PO_COMPLETED,
    reusedEvent: EVENT_PO_REUSED,
    run: () => deps.agent.runPurchaseOrder({ goal: buildPoGoal(parsed) }),
  });
  if (po.finished) {
    return haltJob(deps, jobId, collected, po.status, emit);
  }
  collected.purchase_order_id = po.orderId;

  const so = await runChainStep(deps, parsed, jobId, emit, {
    kind: TASK_KIND_SO,
    completedEvent: EVENT_SO_COMPLETED,
    reusedEvent: EVENT_SO_REUSED,
    run: () =>
      deps.agent.runSalesOrder({
        goal: buildSoGoal(parsed, po.orderId),
        purchaseOrderId: po.orderId,
      }),
  });
  if (so.finished) {
    return haltJob(deps, jobId, collected, so.status, emit);
  }
  collected.sales_order_id = so.orderId;

  const stock = await runChainStep(deps, parsed, jobId, emit, {
    kind: TASK_KIND_STOCK,
    completedEvent: EVENT_STOCK_COMPLETED,
    reusedEvent: EVENT_STOCK_REUSED,
    run: () =>
      deps.agent.runStockEntry({
        goal: buildStockGoal(parsed, po.orderId, so.orderId),
        purchaseOrderId: po.orderId,
        salesOrderId: so.orderId,
      }),
  });
  if (stock.finished) {
    return haltJob(deps, jobId, collected, stock.status, emit);
  }
  collected.stock_entry_id = stock.orderId;

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

  const taskId: string = crypto.randomUUID();
  insertTask(deps.db, { id: taskId, jobId, kind: step.kind, status: TASK_STATUS_RUNNING });

  let result: AgentStepResult;
  try {
    result = await step.run();
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateTask(deps.db, taskId, TASK_STATUS_FAILED, null);
    emit({ type: EVENT_FAILED, jobId, taskId, reason });
    logger.error({ jobId, taskId, reason }, JOB_LOG_MESSAGE);
    return { finished: true, status: JOB_STATUS_FAILED };
  }

  if (result.status === STEP_NEEDS_INPUT) {
    insertQuestion(deps.db, {
      id: crypto.randomUUID(),
      jobId,
      qNorm: result.question.toLowerCase().trim(),
      qRaw: result.question,
      status: QUESTION_STATUS_QUEUED,
    });
    updateTask(deps.db, taskId, TASK_STATUS_PAUSED, null);
    emit({ type: EVENT_WAITING, jobId, taskId, reason: result.question });
    return { finished: true, status: JOB_STATUS_WAITING };
  }

  updateTask(deps.db, taskId, TASK_STATUS_DONE, result.orderId);
  emit({ type: step.completedEvent, jobId, taskId, orderId: result.orderId });
  return { finished: false, orderId: result.orderId };
}
