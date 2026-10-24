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
  TASK_STATUS_DONE,
  TASK_STATUS_FAILED,
  TASK_STATUS_PAUSED,
  TASK_STATUS_RUNNING,
  type JobInput,
  type JobView,
} from "shared";
import {
  findCompletedPo,
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
export const EVENT_WAITING = "waiting" as const;
export const EVENT_COMPLETED = "completed" as const;
export const EVENT_FAILED = "failed" as const;

export type JobEventType =
  | typeof EVENT_STARTED
  | typeof EVENT_PO_COMPLETED
  | typeof EVENT_PO_REUSED
  | typeof EVENT_WAITING
  | typeof EVENT_COMPLETED
  | typeof EVENT_FAILED;

export type JobEvent = {
  type: JobEventType;
  jobId: string;
  orderId?: string;
  reason?: string;
};

export const STEP_OK = "ok" as const;
export const STEP_NEEDS_INPUT = "needs_input" as const;

export type AgentStepResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string };

export type AgentPort = {
  runPurchaseOrder: (goal: string) => Promise<AgentStepResult>;
};

export type OrchestratorDeps = {
  db: Database;
  agent: AgentPort;
  onEvent?: (event: JobEvent) => void;
};

const GOAL_ON = "On" as const;
const GOAL_PURCHASE_ORDER_PATH = "/app/purchase-order" as const;
const GOAL_SEARCH = "Search existing Purchase Order by" as const;
export const GOAL_IF_FOUND = "If found, return its ID and do not create." as const;
const GOAL_ELSE_CREATE = "Else create Purchase Order for supplier" as const;
const GOAL_WITH_ITEMS = "with items" as const;
const GOAL_FOLLOWING_INSTRUCTION = "following instruction" as const;
const GOAL_DROPDOWNS =
  "Wait explicitly for slow dynamic dropdown options; retry up to 3 times." as const;
const GOAL_RETURN = "Return JSON {purchase_order_id}." as const;
const INVOICE_NO_KEY = "invoice_no" as const;
const SUPPLIER_KEY = "supplier" as const;
const SPACE = " " as const;
const EQUALS = "=" as const;
const PLUS = "+" as const;
const JOB_LOG_MESSAGE = "job_transition" as const;
const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;

function buildPoGoal(input: JobInput): string {
  const where: string = [
    INVOICE_NO_KEY,
    EQUALS,
    input.invoice_json.invoice_no,
    PLUS,
    SUPPLIER_KEY,
    EQUALS,
    input.invoice_json.supplier,
  ].join(SPACE);
  return [
    GOAL_ON,
    `${input.erp_host}${GOAL_PURCHASE_ORDER_PATH}`,
    GOAL_SEARCH,
    where,
    GOAL_IF_FOUND,
    GOAL_ELSE_CREATE,
    input.invoice_json.supplier,
    GOAL_WITH_ITEMS,
    JSON.stringify(input.invoice_json.items),
    GOAL_FOLLOWING_INSTRUCTION,
    input.instruction,
    GOAL_DROPDOWNS,
    GOAL_RETURN,
  ].join(SPACE);
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

export async function createJob(input: JobInput, deps: OrchestratorDeps): Promise<JobView> {
  const parsed: JobInput = JobInputSchema.parse(input);
  const emit = (event: JobEvent): void => {
    logger.info(
      { jobId: event.jobId, type: event.type, orderId: event.orderId, reason: event.reason },
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

  const reused: string | undefined = findCompletedPo(
    deps.db,
    parsed.invoice_json.invoice_no,
    parsed.invoice_json.supplier,
    parsed.erp_host,
  );
  if (reused !== undefined) {
    const taskId: string = crypto.randomUUID();
    insertTask(deps.db, {
      id: taskId,
      jobId,
      kind: TASK_KIND_PO,
      status: TASK_STATUS_DONE,
      outputId: reused,
    });
    updateJobResultIds(deps.db, jobId, { purchase_order_id: reused });
    updateJobStatus(deps.db, jobId, JOB_STATUS_DONE);
    emit({ type: EVENT_PO_REUSED, jobId, orderId: reused });
    emit({ type: EVENT_COMPLETED, jobId, orderId: reused });
    return toView(deps.db, jobId);
  }

  const taskId: string = crypto.randomUUID();
  insertTask(deps.db, { id: taskId, jobId, kind: TASK_KIND_PO, status: TASK_STATUS_RUNNING });

  let step: AgentStepResult;
  try {
    step = await deps.agent.runPurchaseOrder(buildPoGoal(parsed));
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateTask(deps.db, taskId, TASK_STATUS_FAILED, null);
    updateJobStatus(deps.db, jobId, JOB_STATUS_FAILED);
    emit({ type: EVENT_FAILED, jobId, reason });
    logger.error({ jobId, reason }, JOB_LOG_MESSAGE);
    return toView(deps.db, jobId);
  }

  if (step.status === STEP_NEEDS_INPUT) {
    const questionId: string = crypto.randomUUID();
    insertQuestion(deps.db, {
      id: questionId,
      jobId,
      qNorm: step.question.toLowerCase().trim(),
      qRaw: step.question,
      status: QUESTION_STATUS_QUEUED,
    });
    updateTask(deps.db, taskId, TASK_STATUS_PAUSED, null);
    updateJobStatus(deps.db, jobId, JOB_STATUS_WAITING);
    emit({ type: EVENT_WAITING, jobId, reason: step.question });
    return toView(deps.db, jobId);
  }

  updateTask(deps.db, taskId, TASK_STATUS_DONE, step.orderId);
  updateJobResultIds(deps.db, jobId, { purchase_order_id: step.orderId });
  updateJobStatus(deps.db, jobId, JOB_STATUS_DONE);
  emit({ type: EVENT_PO_COMPLETED, jobId, orderId: step.orderId });
  emit({ type: EVENT_COMPLETED, jobId, orderId: step.orderId });
  return toView(deps.db, jobId);
}
