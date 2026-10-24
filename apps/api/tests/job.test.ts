import { expect, test } from "bun:test";
import {
  DEMO_ERP_HOST,
  DEMO_INSTRUCTION,
  DEMO_INVOICE,
  DEMO_INVOICE_NO,
  DEMO_PO_ID,
  DEMO_PROFILE_ID,
  DEMO_QUESTION_NORM,
  DEMO_QUESTION_RAW,
  DEMO_SUPPLIER,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  QUESTION_STATUS_QUEUED,
  TASK_KIND_PO,
  TASK_STATUS_DONE,
  TASK_STATUS_FAILED,
  TASK_STATUS_PAUSED,
  type JobInput,
} from "shared";
import { openDb } from "../src/db";
import {
  EVENT_COMPLETED,
  EVENT_PO_COMPLETED,
  EVENT_PO_REUSED,
  EVENT_STARTED,
  EVENT_WAITING,
  GOAL_IF_FOUND,
  STEP_NEEDS_INPUT,
  STEP_OK,
  type AgentPort,
  type AgentStepResult,
  type JobEvent,
} from "../src/orchestrator";
import { createJob, getJob } from "../src/orchestrator";

const STUB_THROW_MESSAGE = "stub_agent_throw" as const;
const SINGLE_COUNT = 1 as const;

function makeInput(): JobInput {
  return {
    invoice_json: DEMO_INVOICE,
    instruction: DEMO_INSTRUCTION,
    erp_host: DEMO_ERP_HOST,
    profile_id: DEMO_PROFILE_ID,
  };
}

function okAgent(orderId: string, calls: string[]): AgentPort {
  return {
    runPurchaseOrder: (goal: string) => {
      calls.push(goal);
      const result: AgentStepResult = { status: STEP_OK, orderId };
      return Promise.resolve(result);
    },
  };
}

test("valid job returns the canned purchase order id and progresses to completion", async () => {
  const calls: string[] = [];
  const events: JobEvent[] = [];
  const db = openDb();
  const view = await createJob(makeInput(), {
    db,
    agent: okAgent(DEMO_PO_ID, calls),
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  });
  expect(view.status).toBe(JOB_STATUS_DONE);
  expect(view.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
  expect(view.tasks).toHaveLength(SINGLE_COUNT);
  expect(view.tasks[0]?.kind).toBe(TASK_KIND_PO);
  expect(view.tasks[0]?.status).toBe(TASK_STATUS_DONE);
  expect(view.tasks[0]?.output_id).toBe(DEMO_PO_ID);
  expect(events.map((event) => event.type)).toEqual([EVENT_STARTED, EVENT_PO_COMPLETED, EVENT_COMPLETED]);
  const goal: string | undefined = calls[0];
  expect(goal).toContain(DEMO_INVOICE_NO);
  expect(goal).toContain(DEMO_SUPPLIER);
  expect(goal).toContain(GOAL_IF_FOUND);
  const stored = getJob(db, view.id);
  expect(stored?.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
});

test("retry with the same invoice number and supplier reuses the existing id", async () => {
  const calls: string[] = [];
  const events: JobEvent[] = [];
  const db = openDb();
  const deps = {
    db,
    agent: okAgent(DEMO_PO_ID, calls),
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  };
  const first = await createJob(makeInput(), deps);
  const second = await createJob(makeInput(), deps);
  expect(second.result_ids.purchase_order_id).toBe(first.result_ids.purchase_order_id);
  expect(calls).toHaveLength(SINGLE_COUNT);
  expect(events.map((event) => event.type)).toContain(EVENT_PO_REUSED);
});

test("agent doubt pauses the job with a queued question instead of guessing", async () => {
  const events: JobEvent[] = [];
  const db = openDb();
  const doubtingAgent: AgentPort = {
    runPurchaseOrder: () => {
      const result: AgentStepResult = { status: STEP_NEEDS_INPUT, question: DEMO_QUESTION_RAW };
      return Promise.resolve(result);
    },
  };
  const view = await createJob(makeInput(), {
    db,
    agent: doubtingAgent,
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  });
  expect(view.status).toBe(JOB_STATUS_WAITING);
  expect(view.result_ids.purchase_order_id).toBeUndefined();
  expect(view.questions).toHaveLength(SINGLE_COUNT);
  expect(view.questions[0]?.q_raw).toBe(DEMO_QUESTION_RAW);
  expect(view.questions[0]?.q_norm).toBe(DEMO_QUESTION_NORM);
  expect(view.questions[0]?.status).toBe(QUESTION_STATUS_QUEUED);
  expect(view.tasks[0]?.status).toBe(TASK_STATUS_PAUSED);
  expect(events.map((event) => event.type)).toContain(EVENT_WAITING);
});

test("unexpected agent failure fails the job loudly", async () => {
  const db = openDb();
  const throwingAgent: AgentPort = {
    runPurchaseOrder: () => Promise.reject(new Error(STUB_THROW_MESSAGE)),
  };
  const view = await createJob(makeInput(), { db, agent: throwingAgent });
  expect(view.status).toBe(JOB_STATUS_FAILED);
  expect(view.tasks[0]?.status).toBe(TASK_STATUS_FAILED);
});
