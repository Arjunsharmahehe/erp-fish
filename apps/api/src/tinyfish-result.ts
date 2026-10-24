import { RunStatus } from "@tiny-fish/sdk";
import { LABEL_SEPARATOR, MIN_TEXT_LENGTH } from "shared";
import * as z from "zod";
import { STEP_NEEDS_INPUT, STEP_OK, type AgentStepResult } from "./types";

export const AGENT_RESULT_INVALID_MESSAGE = "agent_result_invalid" as const;
export const AGENT_RUN_FAILED_MESSAGE = "agent_run_failed" as const;
export const AGENT_RUN_CANCELLED_MESSAGE = "agent_run_cancelled" as const;
export const AGENT_RUN_UNEXPECTED_STATUS_MESSAGE = "agent_run_unexpected_status" as const;

const PoOkResultSchema = z.object({
  purchase_order_id: z.string().min(MIN_TEXT_LENGTH),
});

const PoQuestionResultSchema = z.object({
  question: z.string().min(MIN_TEXT_LENGTH),
});

export interface TinyfishRunOutcome {
  status: string;
  result: unknown;
  errorCategory?: string;
  errorMessage?: string;
}

function failedReason(outcome: TinyfishRunOutcome): string {
  const parts: string[] = [AGENT_RUN_FAILED_MESSAGE];
  if (outcome.errorCategory !== undefined && outcome.errorCategory !== "") {
    parts.push(outcome.errorCategory);
  }
  if (outcome.errorMessage !== undefined && outcome.errorMessage !== "") {
    parts.push(outcome.errorMessage);
  }
  return parts.join(LABEL_SEPARATOR);
}

// Pure decision logic for the PO step: terminal TinyFish run -> orchestrator
// result. All branching lives here (unit-tested); the queue/poll shell in
// create-tinyfish-agent.ts stays thin and is verified by the live run.
export function mapPoRunToStepResult(run: TinyfishRunOutcome): AgentStepResult {
  if (run.status === RunStatus.COMPLETED) {
    const ok = PoOkResultSchema.safeParse(run.result);
    if (ok.success) {
      return { status: STEP_OK, orderId: ok.data.purchase_order_id };
    }
    const doubt = PoQuestionResultSchema.safeParse(run.result);
    if (doubt.success) {
      return { status: STEP_NEEDS_INPUT, question: doubt.data.question };
    }
    throw new Error(AGENT_RESULT_INVALID_MESSAGE);
  }
  if (run.status === RunStatus.FAILED) {
    throw new Error(failedReason(run));
  }
  if (run.status === RunStatus.CANCELLED) {
    throw new Error(AGENT_RUN_CANCELLED_MESSAGE);
  }
  throw new Error(AGENT_RUN_UNEXPECTED_STATUS_MESSAGE);
}
