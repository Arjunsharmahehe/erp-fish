import type { Database } from "bun:sqlite";
import {
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  type TaskKind,
  type MemoryDecisionSchema,
} from "shared";
import type { z } from "zod";
import {
  EVENT_PO_COMPLETED,
  EVENT_PO_REUSED,
  EVENT_SO_COMPLETED,
  EVENT_SO_REUSED,
  EVENT_STOCK_COMPLETED,
  EVENT_STOCK_REUSED,
  type JobEvent,
} from "./events";
import type { QaPair } from "./goals";

export const STEP_OK = "ok" as const;
export const STEP_NEEDS_INPUT = "needs_input" as const;
export const STEP_FAILED = "failed" as const;

export type AgentStepResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string };

export type StepAttemptResult =
  | { status: typeof STEP_OK; orderId: string }
  | { status: typeof STEP_NEEDS_INPUT; question: string }
  | { status: typeof STEP_FAILED };

export interface AgentPort {
  decideMemory?: (input: { question: string; answer: string; supplier: string }) => Promise<z.infer<typeof MemoryDecisionSchema>>;
  runPurchaseOrder: (input: { goal: string }) => Promise<AgentStepResult>;
  runSalesOrder: (input: { goal: string; purchaseOrderId: string }) => Promise<AgentStepResult>;
  runStockEntry: (input: {
    goal: string;
    purchaseOrderId: string;
    salesOrderId: string;
  }) => Promise<AgentStepResult>;
}

export interface OrchestratorDeps {
  userId?: string;
  db: Database;
  agent: AgentPort;
  onEvent?: (event: JobEvent) => void;
}

export interface StepDef {
  kind: TaskKind;
  completedEvent:
    | typeof EVENT_PO_COMPLETED
    | typeof EVENT_SO_COMPLETED
    | typeof EVENT_STOCK_COMPLETED;
  reusedEvent: typeof EVENT_PO_REUSED | typeof EVENT_SO_REUSED | typeof EVENT_STOCK_REUSED;
  run: (qa: QaPair | undefined) => Promise<AgentStepResult>;
}

export type ChainStep =
  | { finished: false; orderId: string }
  | { finished: true; status: typeof JOB_STATUS_WAITING | typeof JOB_STATUS_FAILED };
