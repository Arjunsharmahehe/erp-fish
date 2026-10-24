import { TASK_STATUS_FAILED } from "shared";
import { updateTask } from "./db";
import { EVENT_FAILED, type EmitFn } from "./events";
import type { QaPair } from "./goals";
import { logger } from "./logger";
import {
  STEP_FAILED,
  type OrchestratorDeps,
  type StepAttemptResult,
  type StepDef,
} from "./types";

const JOB_LOG_MESSAGE = "job_transition" as const;

export async function invokeStep(
  deps: OrchestratorDeps,
  request: { jobId: string; taskId: string; emit: EmitFn; step: StepDef; qa: QaPair | undefined },
): Promise<StepAttemptResult> {
  try {
    return await request.step.run(request.qa);
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateTask(deps.db, { taskId: request.taskId, status: TASK_STATUS_FAILED, outputId: null });
    request.emit({ type: EVENT_FAILED, jobId: request.jobId, taskId: request.taskId, reason });
    logger.error({ jobId: request.jobId, taskId: request.taskId, reason }, JOB_LOG_MESSAGE);
    return { status: STEP_FAILED };
  }
}

export async function retryOnceWithAnswer(
  deps: OrchestratorDeps,
  request: {
    jobId: string;
    taskId: string;
    emit: EmitFn;
    step: StepDef;
    question: string;
    answer: string;
  },
): Promise<StepAttemptResult> {
  return invokeStep(deps, {
    jobId: request.jobId,
    taskId: request.taskId,
    emit: request.emit,
    step: request.step,
    qa: { question: request.question, answer: request.answer },
  });
}
