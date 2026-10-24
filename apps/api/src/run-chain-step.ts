import {
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  QUESTION_STATUS_QUEUED,
  TASK_STATUS_DONE,
  TASK_STATUS_PAUSED,
  TASK_STATUS_RUNNING,
  type JobInput,
} from "shared";
import {
  findCompletedOutput,
  insertQuestion,
  insertTask,
  updateTask,
  findMemoryAnswer,
} from "./db";
import {
  EVENT_MEMORY_HIT,
  EVENT_WAITING,
  type EmitFn,
} from "./events";
import { invokeStep, retryOnceWithAnswer } from "./invoke";
import {
  STEP_FAILED,
  STEP_OK,
  type ChainStep,
  type OrchestratorDeps,
  type StepAttemptResult,
  type StepDef,
} from "./types";


function reuseCompletedOutput(
  deps: OrchestratorDeps,
  request: { parsed: JobInput; jobId: string; step: StepDef; emit: EmitFn },
): ChainStep | undefined {
  const reused: string | undefined = findCompletedOutput(deps.db, {
    kind: request.step.kind,
    invoiceNo: request.parsed.invoice_json.invoice_no,
    supplier: request.parsed.invoice_json.supplier,
    erpHost: request.parsed.erp_host,
  });
  if (reused === undefined) {
    return undefined;
  }
  const reusedTaskId: string = crypto.randomUUID();
  insertTask(deps.db, {
    id: reusedTaskId,
    jobId: request.jobId,
    kind: request.step.kind,
    status: TASK_STATUS_DONE,
    outputId: reused,
  });
  request.emit({
    type: request.step.reusedEvent,
    jobId: request.jobId,
    taskId: reusedTaskId,
    orderId: reused,
  });
  return { finished: false, orderId: reused };
}

function prepareStepTask(
  deps: OrchestratorDeps,
  request: { jobId: string; step: StepDef; resumedTaskId: string | undefined },
): string {
  const taskId: string = request.resumedTaskId ?? crypto.randomUUID();
  if (request.resumedTaskId === undefined) {
    insertTask(deps.db, {
      id: taskId,
      jobId: request.jobId,
      kind: request.step.kind,
      status: TASK_STATUS_RUNNING,
    });
  } else {
    updateTask(deps.db, { taskId, status: TASK_STATUS_RUNNING, outputId: null });
  }
  return taskId;
}

function completeStepTask(
  deps: OrchestratorDeps,
  request: { jobId: string; taskId: string; step: StepDef; orderId: string; emit: EmitFn },
): ChainStep {
  updateTask(deps.db, { taskId: request.taskId, status: TASK_STATUS_DONE, outputId: request.orderId });
  request.emit({
    type: request.step.completedEvent,
    jobId: request.jobId,
    taskId: request.taskId,
    orderId: request.orderId,
  });
  return { finished: false, orderId: request.orderId };
}

function pauseForAnswer(
  deps: OrchestratorDeps,
  request: { jobId: string; taskId: string; emit: EmitFn; step: StepDef; question: string },
): ChainStep {
  insertQuestion(deps.db, {
    id: crypto.randomUUID(),
    jobId: request.jobId,
    qNorm: request.question.toLowerCase().trim(),
    qRaw: request.question,
    status: QUESTION_STATUS_QUEUED,
  });
  updateTask(deps.db, { taskId: request.taskId, status: TASK_STATUS_PAUSED, outputId: null });
  request.emit({ type: EVENT_WAITING, jobId: request.jobId, taskId: request.taskId, reason: request.question });
  return { finished: true, status: JOB_STATUS_WAITING };
}

async function retryWithMemorizedAnswer(
  deps: OrchestratorDeps,
  request: {
    parsed: JobInput;
    jobId: string;
    taskId: string;
    emit: EmitFn;
    step: StepDef;
    question: string;
  },
): Promise<ChainStep | undefined> {
  const memorized: string | undefined = findMemoryAnswer(deps.db, {
    erpHost: request.parsed.erp_host,
    qNorm: request.question.toLowerCase().trim(),
  });
  if (memorized === undefined) {
    return undefined;
  }
  request.emit({ type: EVENT_MEMORY_HIT, jobId: request.jobId, taskId: request.taskId });
  const retry: StepAttemptResult = await retryOnceWithAnswer(deps, {
    jobId: request.jobId,
    taskId: request.taskId,
    emit: request.emit,
    step: request.step,
    question: request.question,
    answer: memorized,
  });
  if (retry.status === STEP_OK) {
    return completeStepTask(deps, {
      jobId: request.jobId,
      taskId: request.taskId,
      step: request.step,
      orderId: retry.orderId,
      emit: request.emit,
    });
  }
  if (retry.status === STEP_FAILED) {
    return { finished: true, status: JOB_STATUS_FAILED };
  }
  return pauseForAnswer(deps, {
    jobId: request.jobId,
    taskId: request.taskId,
    emit: request.emit,
    step: request.step,
    question: retry.question,
  });
}

async function retryWithMemory(
  deps: OrchestratorDeps,
  request: {
    parsed: JobInput;
    jobId: string;
    taskId: string;
    emit: EmitFn;
    step: StepDef;
    question: string;
  },
): Promise<ChainStep> {
  const retried = await retryWithMemorizedAnswer(deps, request);
  if (retried !== undefined) {
    return retried;
  }
  return pauseForAnswer(deps, {
    jobId: request.jobId,
    taskId: request.taskId,
    emit: request.emit,
    step: request.step,
    question: request.question,
  });
}

export async function runChainStep(
  deps: OrchestratorDeps,
  request: {
    parsed: JobInput;
    jobId: string;
    emit: EmitFn;
    step: StepDef;
    resumedTaskId: string | undefined;
  },
): Promise<ChainStep> {
  const reused = reuseCompletedOutput(deps, request);
  if (reused !== undefined) {
    return reused;
  }
  const taskId: string = prepareStepTask(deps, request);
  const first: StepAttemptResult = await invokeStep(deps, {
    jobId: request.jobId,
    taskId,
    emit: request.emit,
    step: request.step,
    qa: undefined,
  });
  if (first.status === STEP_OK) {
    return completeStepTask(deps, {
      jobId: request.jobId,
      taskId,
      step: request.step,
      orderId: first.orderId,
      emit: request.emit,
    });
  }
  if (first.status === STEP_FAILED) {
    return { finished: true, status: JOB_STATUS_FAILED };
  }
  return retryWithMemory(deps, {
    parsed: request.parsed,
    jobId: request.jobId,
    taskId,
    emit: request.emit,
    step: request.step,
    question: first.question,
  });
}
