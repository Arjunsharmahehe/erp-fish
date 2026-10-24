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
  LEARNING,
  MemoryDecisionSchema,
  type MemoryScope,
  type LearningQuestion,
} from "shared";
import {
  answerQuestionRow,
  findJobRow,
  findQuestionRow,
  insertJob,
  updateJobStatus,
} from "./db";
import { EVENT_STARTED } from "./events";
import { pausedStep, rebuildCollected, STEP_ORDER, toView } from "./queries";
import type { OrchestratorDeps } from "./types";
import { makeEmit, runStepsFrom } from "./chain";
import { JOB_OWNERS_SQL } from "./job-ownership";
import { answerLearningQuestion, learningQuestion, learnedContext, listSavedMemories, rememberAnswer, listLearningQuestions } from "./learning";
import { withChatLock } from "./chat-lock";

const JOB_NOT_FOUND_MESSAGE = "job_not_found_after_create" as const;
const ANSWER_TARGET_MESSAGE = "answer_target_not_queued" as const;
const INVALID_ANSWER_MESSAGE = "answer_must_not_be_blank" as const;

async function recordJobAnswer(deps: OrchestratorDeps, options: { scope: MemoryScope; stored: LearningQuestion; answer: string; supplier: string }) {
  const { scope, stored, supplier } = options;
  const answer = stored.answer ?? options.answer;
  if (stored.status === "pending") answerLearningQuestion(deps.db, { scope, id: stored.id, answer });
  const decision = MemoryDecisionSchema.parse(await deps.agent.decideMemory?.({ question: stored.question, answer, supplier }) ?? null);
  if (decision) rememberAnswer(deps.db, { scope, input: { question_id: stored.id, ...decision } });
  return answer;
}

export interface AnswerInput {
  jobId: string;
  questionId: string;
  answer: string;
}

export function listMemory(db: Database, scope: MemoryScope): MemoryEntry[] {
  return listSavedMemories(db, scope).map((entry) => ({ erp_host: entry.erp_host, q_norm: entry.question.toLowerCase().trim(), answer: entry.answer }));
}

export function getLearnedContext(db: Database, scope: MemoryScope): string {
  return learnedContext(db, scope);
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
  if (deps.userId) deps.db.query(JOB_OWNERS_SQL.insert).run(jobId, deps.userId);
  emit({ type: EVENT_STARTED, jobId });
  const learned: string = getLearnedContext(deps.db, { erpHost: parsed.erp_host, userId: deps.userId ?? LEARNING.legacyOwner });
  return runStepsFrom(deps, {
    parsed,
    learned,
    jobId,
    emit,
    collected: {},
    resume: { index: 0, taskId: undefined },
  });
}

async function answerQueuedQuestion(
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
  const scope = { userId: deps.userId ?? LEARNING.legacyOwner, erpHost: job.erp_host };
  const stored = learningQuestion(deps.db, { scope: scope, id: input.questionId });
  const answer = await recordJobAnswer(deps, { scope, stored, answer: trimmedAnswer, supplier: parsed.invoice_json.supplier });
  answerQuestionRow(deps.db, { questionId: input.questionId, answer });
  updateJobStatus(deps.db, { jobId: input.jobId, status: JOB_STATUS_RUNNING });
  const emit = makeEmit(deps);
  const collected: AgentResultIds = rebuildCollected(deps.db, input.jobId);
  const currentJobAnswers = listLearningQuestions(deps.db, { scope, sourceType: "job", sourceId: input.jobId })
    .filter((item) => item.status === "answered").map(({ question, answer }) => ({ question, answer }));
  const learned: string = JSON.stringify({ savedMemories: getLearnedContext(deps.db, scope), currentJobAnswers });
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

export function answerQuestion(input: AnswerInput, deps: OrchestratorDeps): Promise<JobView> {
  return withChatLock(input.jobId, () => answerQueuedQuestion(input, deps));
}
