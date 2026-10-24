import {
  DEMO_PO_ID,
  DEMO_QUESTION_RAW,
  DEMO_SO_ID,
  DEMO_STOCK_ID,
  DEMO_INSTRUCTION,
  DEMO_ANSWER,
} from "shared";
import {
  STEP_NEEDS_INPUT,
  STEP_OK,
  type AgentPort,
  type AgentStepResult,
} from "./orchestrator";

export const DOUBT_TRIGGER = "doubt" as const;
export const MISSING_DEMO_CONFIG_MESSAGE = "demo_agent_disabled" as const;

function okResult(orderId: string): AgentStepResult {
  return { status: STEP_OK, orderId };
}

function doubtResult(): AgentStepResult {
  return { status: STEP_NEEDS_INPUT, question: DEMO_QUESTION_RAW };
}

export function createDemoAgent(instruction: string): AgentPort {
  const doubts: boolean = instruction.includes(DOUBT_TRIGGER);
  return {
    decideMemory: ({ question }) => Promise.resolve({ question, context: DEMO_INSTRUCTION }),
    runPurchaseOrder: ({ goal }) => Promise.resolve(doubts && !goal.includes(DEMO_ANSWER) ? doubtResult() : okResult(DEMO_PO_ID)),
    runSalesOrder: () => Promise.resolve(okResult(DEMO_SO_ID)),
    runStockEntry: () => Promise.resolve(okResult(DEMO_STOCK_ID)),
  };
}
