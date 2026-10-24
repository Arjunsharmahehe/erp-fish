import { expect, test } from "bun:test";
import {
  DEMO_ANSWER,
  DEMO_ERP_HOST,
  DEMO_ERP_HOST_2,
  DEMO_INSTRUCTION,
  DEMO_INVOICE,
  DEMO_INVOICE_NO,
  DEMO_INVOICE_NO_2,
  DEMO_INVOICE_NO_3,
  DEMO_PO_ID,
  DEMO_PROFILE_ID,
  DEMO_QUESTION_NORM,
  DEMO_QUESTION_RAW,
  DEMO_SO_ID,
  DEMO_STOCK_ID,
  JOB_STATUS_DONE,
  JOB_STATUS_WAITING,
  QUESTION_STATUS_ANSWERED,
  QUESTION_STATUS_QUEUED,
  TASK_KIND_PO,
  TASK_STATUS_DONE,
  type AgentResultIds,
  type JobInput,
} from "shared";
import { openDb } from "../src/db";
import {
  EVENT_MEMORY_HIT,
  EVENT_WAITING,
  STEP_NEEDS_INPUT,
  STEP_OK,
  type AgentPort,
  type AgentStepResult,
  type JobEvent,
} from "../src/orchestrator";
import { answerQuestion, createJob, getJob, getLearnedContext, listMemory } from "../src/orchestrator";
import { eventTypes } from "./helpers";

const SINGLE_COUNT = 1 as const;
const NO_QUESTIONS = 0 as const;
const TWO_GOALS = 2 as const;
const RETRY_GOAL_INDEX = 1 as const;
const MISSING_QUESTION_MESSAGE = "missing_question" as const;
const BLANK_ANSWER = "   " as const;
const JOIN_SPACE = " " as const;
const EMPTY_LEARNED_CONTEXT = "" as const;

function requiredId(value: string | undefined): string {
  if (value === undefined) {
    throw new Error(MISSING_QUESTION_MESSAGE);
  }
  return value;
}

function makeInput(invoiceNo: string = DEMO_INVOICE_NO, erpHost: string = DEMO_ERP_HOST): JobInput {
  return {
    invoice_json: { ...DEMO_INVOICE, invoice_no: invoiceNo },
    instruction: DEMO_INSTRUCTION,
    erp_host: erpHost,
    profile_id: DEMO_PROFILE_ID,
  };
}

function okResult(orderId: string): AgentStepResult {
  return { status: STEP_OK, orderId };
}

function doubtResult(): AgentStepResult {
  return { status: STEP_NEEDS_INPUT, question: DEMO_QUESTION_RAW };
}

function alwaysDoubtAgent(): AgentPort {
  return {
    runPurchaseOrder: () => Promise.resolve(doubtResult()),
    runSalesOrder: () => Promise.resolve(doubtResult()),
    runStockEntry: () => Promise.resolve(doubtResult()),
  };
}

function goalAwareAgent(): AgentPort {
  const decide = (goal: string, orderId: string): Promise<AgentStepResult> =>
    Promise.resolve(goal.includes(DEMO_ANSWER) ? okResult(orderId) : doubtResult());
  return {
    runPurchaseOrder: (input: { goal: string }) => decide(input.goal, DEMO_PO_ID),
    runSalesOrder: (input: { goal: string; purchaseOrderId: string }) =>
      decide([input.purchaseOrderId, input.goal].join(JOIN_SPACE), DEMO_SO_ID),
    runStockEntry: (input: { goal: string; purchaseOrderId: string; salesOrderId: string }) =>
      decide([input.purchaseOrderId, input.salesOrderId, input.goal].join(JOIN_SPACE), DEMO_STOCK_ID),
  };
}

test("answering a queued question resumes the paused job and completes the chain", async () => {
  const db = openDb();
  const paused = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  expect(paused.status).toBe(JOB_STATUS_WAITING);
  const questionId: string = requiredId(paused.questions[0]?.id);
  const resumed = await answerQuestion(
    { jobId: paused.id, questionId, answer: DEMO_ANSWER },
    { db, agent: goalAwareAgent() },
  );
  expect(resumed.status).toBe(JOB_STATUS_DONE);
  const expectedIds: AgentResultIds = {
    purchase_order_id: DEMO_PO_ID,
    sales_order_id: DEMO_SO_ID,
    stock_entry_id: DEMO_STOCK_ID,
  };
  expect(resumed.result_ids).toEqual(expectedIds);
  expect(resumed.questions[0]?.status).toBe(QUESTION_STATUS_ANSWERED);
  const poTasks = resumed.tasks.filter((task) => task.kind === TASK_KIND_PO);
  expect(poTasks).toHaveLength(SINGLE_COUNT);
  expect(poTasks[0]?.status).toBe(TASK_STATUS_DONE);
  const entries = listMemory(db, DEMO_ERP_HOST);
  expect(entries).toHaveLength(SINGLE_COUNT);
  expect(entries[0]).toEqual({
    erp_host: DEMO_ERP_HOST,
    q_norm: DEMO_QUESTION_NORM,
    answer: DEMO_ANSWER,
  });
});

test("the same doubt on the next job for the same host produces zero new questions", async () => {
  const db = openDb();
  const first = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const firstQuestionId: string = requiredId(first.questions[0]?.id);
  await answerQuestion(
    { jobId: first.id, questionId: firstQuestionId, answer: DEMO_ANSWER },
    { db, agent: goalAwareAgent() },
  );
  const second = await createJob(makeInput(DEMO_INVOICE_NO_2), { db, agent: goalAwareAgent() });
  expect(second.status).toBe(JOB_STATUS_DONE);
  expect(second.questions).toHaveLength(NO_QUESTIONS);
  expect(second.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
});

test("a different host still asks instead of reusing memorized answers", async () => {
  const db = openDb();
  const first = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const firstQuestionId: string = requiredId(first.questions[0]?.id);
  await answerQuestion(
    { jobId: first.id, questionId: firstQuestionId, answer: DEMO_ANSWER },
    { db, agent: goalAwareAgent() },
  );
  const other = await createJob(makeInput(DEMO_INVOICE_NO, DEMO_ERP_HOST_2), {
    db,
    agent: goalAwareAgent(),
  });
  expect(other.status).toBe(JOB_STATUS_WAITING);
  expect(other.questions).toHaveLength(SINGLE_COUNT);
  expect(other.questions[0]?.status).toBe(QUESTION_STATUS_QUEUED);
});

test("memory list shows the learned entry and count per host", async () => {
  const db = openDb();
  const paused = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const questionId: string = requiredId(paused.questions[0]?.id);
  await answerQuestion(
    { jobId: paused.id, questionId, answer: DEMO_ANSWER },
    { db, agent: goalAwareAgent() },
  );
  const entries = listMemory(db, DEMO_ERP_HOST);
  expect(entries).toHaveLength(SINGLE_COUNT);
  expect(entries[0]?.answer).toBe(DEMO_ANSWER);
  expect(listMemory(db, DEMO_ERP_HOST_2)).toHaveLength(NO_QUESTIONS);
  expect(getLearnedContext(db, DEMO_ERP_HOST)).toContain(DEMO_ANSWER);
  expect(getLearnedContext(db, DEMO_ERP_HOST_2)).toBe(EMPTY_LEARNED_CONTEXT);
});

test("blank answers are rejected without touching memory", async () => {
  const db = openDb();
  const paused = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const questionId: string = requiredId(paused.questions[0]?.id);
  await expect(
    answerQuestion({ jobId: paused.id, questionId, answer: BLANK_ANSWER }, { db, agent: goalAwareAgent() }),
  ).rejects.toThrow();
  expect(listMemory(db, DEMO_ERP_HOST)).toHaveLength(NO_QUESTIONS);
});

test("answering an already-answered question throws and leaves the job done", async () => {
  const db = openDb();
  const paused = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const questionId: string = requiredId(paused.questions[0]?.id);
  const answered = { jobId: paused.id, questionId, answer: DEMO_ANSWER };
  const resumed = await answerQuestion(answered, { db, agent: goalAwareAgent() });
  expect(resumed.status).toBe(JOB_STATUS_DONE);
  await expect(answerQuestion(answered, { db, agent: goalAwareAgent() })).rejects.toThrow();
  expect(getJob(db, paused.id)?.status).toBe(JOB_STATUS_DONE);
});

test("stale memory retries once with explicit QA then queues on repeated doubt", async () => {
  const events: JobEvent[] = [];
  const seenGoals: string[] = [];
  const recordingDoubter: AgentPort = {
    runPurchaseOrder: (input: { goal: string }) => {
      seenGoals.push(input.goal);
      return Promise.resolve(doubtResult());
    },
    runSalesOrder: () => Promise.resolve(doubtResult()),
    runStockEntry: () => Promise.resolve(doubtResult()),
  };
  const db = openDb();
  const first = await createJob(makeInput(), { db, agent: alwaysDoubtAgent() });
  const firstQuestionId: string = requiredId(first.questions[0]?.id);
  await answerQuestion(
    { jobId: first.id, questionId: firstQuestionId, answer: DEMO_ANSWER },
    { db, agent: goalAwareAgent() },
  );
  const second = await createJob(makeInput(DEMO_INVOICE_NO_3), {
    db,
    agent: recordingDoubter,
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  });
  expect(second.status).toBe(JOB_STATUS_WAITING);
  expect(second.questions).toHaveLength(SINGLE_COUNT);
  expect(eventTypes(events)).toContain(EVENT_MEMORY_HIT);
  expect(eventTypes(events)).toContain(EVENT_WAITING);
  expect(seenGoals).toHaveLength(TWO_GOALS);
  const retryGoal: string | undefined = seenGoals[RETRY_GOAL_INDEX];
  expect(retryGoal).toContain(DEMO_QUESTION_RAW);
  expect(retryGoal).toContain(DEMO_ANSWER);
});
