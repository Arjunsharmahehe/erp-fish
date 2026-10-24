import type { Database } from "bun:sqlite";
import {
  JobViewSchema,
  TASK_KIND_PO,
  TASK_KIND_SO,
  TASK_KIND_STOCK,
  TASK_STATUS_DONE,
  TASK_STATUS_PAUSED,
  type AgentResultIds,
  type JobView,
  type TaskKind,
} from "shared";
import { findJobRow, findQuestionRows, findTaskRows } from "./db";

const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;
const RESUME_STATE_MESSAGE = "resume_state_missing_prior_id" as const;

export const STEP_ORDER: readonly TaskKind[] = [TASK_KIND_PO, TASK_KIND_SO, TASK_KIND_STOCK];

export function toView(db: Database, jobId: string): JobView {
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
  const resultIds: unknown = job.result_ids === null ? null : JSON.parse(job.result_ids);
  return JobViewSchema.parse({
    id: job.id,
    status: job.status,
    erp_host: job.erp_host,
    result_ids: resultIds ?? {},
    tasks,
    questions,
  });
}

export function mustId(value: string | undefined): string {
  if (value === undefined) {
    throw new Error(RESUME_STATE_MESSAGE);
  }
  return value;
}

export function rebuildCollected(db: Database, jobId: string): AgentResultIds {
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

export function pausedStep(
  db: Database,
  jobId: string,
): { index: number; taskId: string } | undefined {
  const paused = findTaskRows(db, jobId).find((task) => task.status === TASK_STATUS_PAUSED);
  if (paused === undefined) {
    return undefined;
  }
  return { index: STEP_ORDER.indexOf(paused.kind), taskId: paused.id };
}
