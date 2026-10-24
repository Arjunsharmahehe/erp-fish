import type { Database } from "bun:sqlite";
import {
  JOB_STATUS_RUNNING,
  JobInputSchema,
  MIN_TEXT_LENGTH,
  QUESTION_STATUS_QUEUED,
  type AgentResultIds,
  type JobInput,
  type JobView,
  type MemoryEntry,
} from "shared";
import {
  answerQuestionRow,
  findJobRow,
  findQuestionRow,
  insertJob,
  listMemoryRows,
  updateJobStatus,
  upsertMemory,
} from "./db";
import { EVENT_STARTED } from "./events";
import { EMPTY_LEARNED, formatQa } from "./goals";
import { pausedStep, rebuildCollected, STEP_ORDER, toView } from "./queries";
import type { OrchestratorDeps } from "./types";
import { makeEmit, runStepsFrom } from "./chain";

const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;
const ANSWER_TARGET_MESSAGE = "answer_target_not_queued" as const;
const INVALID_ANSWER_MESSAGE = "answer_must_not_be_blank" as const;
const LEARNED_JOIN = "\n" as const;

export interface AnswerInput {
  jobId: string;
  questionId: string;
  answer: string;
}

export function listMemory(db: Database, erpHost: string): MemoryEntry[] {
  return listMemoryRows(db, erpHost);
}

export function getLearnedContext(db: Database, erpHost: string): string {
  const entries: MemoryEntry[] = listMemory(db, erpHost);
  if (entries.length === 0) {
    return EMPTY_LEARNED;
  }
  return entries.map((entry) => formatQa(entry.q_norm, entry.answer)).join(LEARNED_JOIN);
}

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
  return runStepsFrom(deps, {
    parsed,
    learned,
    jobId,
    emit,
    collected: {},
    resume: { index: 0, taskId: undefined },
  });
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
  if (question === undefined) {
    throw new Error(ANSWER_TARGET_MESSAGE);
  }
  if (question.job_id !== input.jobId || question.status !== QUESTION_STATUS_QUEUED) {
    throw new Error(ANSWER_TARGET_MESSAGE);
  }
  const job = findJobRow(deps.db, input.jobId);
  if (job === undefined) {
    throw new Error(JOB_NOT_FOUND_MESSAGE);
  }
  const invoiceJson: unknown = JSON.parse(job.invoice_json);
  const parsed: JobInput = JobInputSchema.parse({
    invoice_json: invoiceJson,
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
  answerQuestionRow(deps.db, { questionId: input.questionId, answer: trimmedAnswer });
  updateJobStatus(deps.db, { jobId: input.jobId, status: JOB_STATUS_RUNNING });
  const emit = makeEmit(deps);
  const collected: AgentResultIds = rebuildCollected(deps.db, input.jobId);
  const learned: string = getLearnedContext(deps.db, job.erp_host);
  const resume = pausedStep(deps.db, input.jobId);
  if (resume === undefined || resume.index >= STEP_ORDER.length) {
    return toView(deps.db, input.jobId);
  }
  return runStepsFrom(deps, {
    parsed,
    learned,
    jobId: input.jobId,
    emit,
    collected,
    resume: { index: resume.index, taskId: resume.taskId },
  });
}
