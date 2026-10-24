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
  DEMO_SO_ID,
  DEMO_STOCK_ID,
  DEMO_SUPPLIER,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  QUESTION_STATUS_QUEUED,
  TASK_KIND_PO,
  TASK_KIND_SO,
  TASK_KIND_STOCK,
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
  EVENT_SO_COMPLETED,
  EVENT_SO_REUSED,
  EVENT_STARTED,
  EVENT_STOCK_COMPLETED,
  EVENT_STOCK_REUSED,
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
const RETRIED_SO_CALLS = 2 as const;
const UNREACHABLE_MESSAGE = "unreachable_agent_step" as const;
const JOIN_SPACE = " " as const;

function makeInput(): JobInput {
  return {
    invoice_json: DEMO_INVOICE,
    instruction: DEMO_INSTRUCTION,
    erp_host: DEMO_ERP_HOST,
    profile_id: DEMO_PROFILE_ID,
  };
}

function unreachableStep(): Promise<AgentStepResult> {
  return Promise.reject(new Error(UNREACHABLE_MESSAGE));
}

function okAgent(calls: { po: string[]; so: string[]; stock: string[] }): AgentPort {
  return {
    runPurchaseOrder: (input: { goal: string }) => {
      calls.po.push(input.goal);
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_PO_ID };
      return Promise.resolve(result);
    },
    runSalesOrder: (input: { goal: string; purchaseOrderId: string }) => {
      calls.so.push([input.purchaseOrderId, input.goal].join(JOIN_SPACE));
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_SO_ID };
      return Promise.resolve(result);
    },
    runStockEntry: (input: { goal: string; purchaseOrderId: string; salesOrderId: string }) => {
      calls.stock.push([input.purchaseOrderId, input.salesOrderId, input.goal].join(JOIN_SPACE));
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_STOCK_ID };
      return Promise.resolve(result);
    },
  };
}

function makeCalls(): { po: string[]; so: string[]; stock: string[] } {
  return { po: [], so: [], stock: [] };
}

test("full job returns all three canned ids in purchase sale stock order", async () => {
  const calls = makeCalls();
  const events: JobEvent[] = [];
  const db = openDb();
  const view = await createJob(makeInput(), {
    db,
    agent: okAgent(calls),
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  });
  expect(view.status).toBe(JOB_STATUS_DONE);
  expect(view.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
  expect(view.result_ids.sales_order_id).toBe(DEMO_SO_ID);
  expect(view.result_ids.stock_entry_id).toBe(DEMO_STOCK_ID);
  expect(view.tasks.map((task) => task.kind)).toEqual([TASK_KIND_PO, TASK_KIND_SO, TASK_KIND_STOCK]);
  for (const task of view.tasks) {
    expect(task.status).toBe(TASK_STATUS_DONE);
  }
  expect(view.tasks[0]?.output_id).toBe(DEMO_PO_ID);
  expect(view.tasks[1]?.output_id).toBe(DEMO_SO_ID);
  expect(view.tasks[2]?.output_id).toBe(DEMO_STOCK_ID);
  expect(events.map((event) => event.type)).toEqual([
    EVENT_STARTED,
    EVENT_PO_COMPLETED,
    EVENT_SO_COMPLETED,
    EVENT_STOCK_COMPLETED,
    EVENT_COMPLETED,
  ]);
  const goal: string | undefined = calls.po[0];
  expect(goal).toContain(DEMO_INVOICE_NO);
  expect(goal).toContain(DEMO_SUPPLIER);
  expect(goal).toContain(GOAL_IF_FOUND);
  const stored = getJob(db, view.id);
  expect(stored?.result_ids.stock_entry_id).toBe(DEMO_STOCK_ID);
});

test("retry with the same invoice number and supplier reuses all three ids", async () => {
  const calls = makeCalls();
  const events: JobEvent[] = [];
  const db = openDb();
  const deps = {
    db,
    agent: okAgent(calls),
    onEvent: (event: JobEvent) => {
      events.push(event);
    },
  };
  const first = await createJob(makeInput(), deps);
  const second = await createJob(makeInput(), deps);
  expect(second.result_ids.purchase_order_id).toBe(first.result_ids.purchase_order_id);
  expect(second.result_ids.sales_order_id).toBe(first.result_ids.sales_order_id);
  expect(second.result_ids.stock_entry_id).toBe(first.result_ids.stock_entry_id);
  expect(calls.po).toHaveLength(SINGLE_COUNT);
  expect(calls.so).toHaveLength(SINGLE_COUNT);
  expect(calls.stock).toHaveLength(SINGLE_COUNT);
  const types = events.map((event) => event.type);
  expect(types).toContain(EVENT_PO_REUSED);
  expect(types).toContain(EVENT_SO_REUSED);
  expect(types).toContain(EVENT_STOCK_REUSED);
});

test("later steps receive prior order ids through the agent boundary", async () => {
  const seenSo: string[] = [];
  const seenStock: string[] = [];
  const db = openDb();
  const agent: AgentPort = {
    runPurchaseOrder: () => {
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_PO_ID };
      return Promise.resolve(result);
    },
    runSalesOrder: (input: { goal: string; purchaseOrderId: string }) => {
      seenSo.push(input.purchaseOrderId);
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_SO_ID };
      return Promise.resolve(result);
    },
    runStockEntry: (input: { goal: string; purchaseOrderId: string; salesOrderId: string }) => {
      seenStock.push([input.purchaseOrderId, input.salesOrderId].join(JOIN_SPACE));
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_STOCK_ID };
      return Promise.resolve(result);
    },
  };
  const view = await createJob(makeInput(), { db, agent });
  expect(view.status).toBe(JOB_STATUS_DONE);
  expect(seenSo).toEqual([DEMO_PO_ID]);
  expect(seenStock).toEqual([[DEMO_PO_ID, DEMO_SO_ID].join(JOIN_SPACE)]);
});

test("retry after a later-step failure reuses earlier ids with no duplicate creates", async () => {
  const poCalls: string[] = [];
  const soCalls: string[] = [];
  let soShouldThrow = true;
  const db = openDb();
  const flakyAgent: AgentPort = {
    runPurchaseOrder: (input: { goal: string }) => {
      poCalls.push(input.goal);
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_PO_ID };
      return Promise.resolve(result);
    },
    runSalesOrder: () => {
      soCalls.push(DEMO_SO_ID);
      if (soShouldThrow) {
        return Promise.reject(new Error(STUB_THROW_MESSAGE));
      }
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_SO_ID };
      return Promise.resolve(result);
    },
    runStockEntry: () => {
      const result: AgentStepResult = { status: STEP_OK, orderId: DEMO_STOCK_ID };
      return Promise.resolve(result);
    },
  };
  const failed = await createJob(makeInput(), { db, agent: flakyAgent });
  expect(failed.status).toBe(JOB_STATUS_FAILED);
  expect(failed.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
  expect(failed.result_ids.sales_order_id).toBeUndefined();
  soShouldThrow = false;
  const retried = await createJob(makeInput(), { db, agent: flakyAgent });
  expect(retried.status).toBe(JOB_STATUS_DONE);
  expect(retried.result_ids.purchase_order_id).toBe(DEMO_PO_ID);
  expect(retried.result_ids.sales_order_id).toBe(DEMO_SO_ID);
  expect(retried.result_ids.stock_entry_id).toBe(DEMO_STOCK_ID);
  expect(poCalls).toHaveLength(SINGLE_COUNT);
  expect(soCalls).toHaveLength(RETRIED_SO_CALLS);
});

test("agent doubt pauses the job with a queued question instead of guessing", async () => {
  const events: JobEvent[] = [];
  const db = openDb();
  const doubtingAgent: AgentPort = {
    runPurchaseOrder: () => {
      const result: AgentStepResult = { status: STEP_NEEDS_INPUT, question: DEMO_QUESTION_RAW };
      return Promise.resolve(result);
    },
    runSalesOrder: unreachableStep,
    runStockEntry: unreachableStep,
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
    runSalesOrder: unreachableStep,
    runStockEntry: unreachableStep,
  };
  const view = await createJob(makeInput(), { db, agent: throwingAgent });
  expect(view.status).toBe(JOB_STATUS_FAILED);
  expect(view.tasks[0]?.status).toBe(TASK_STATUS_FAILED);
});
