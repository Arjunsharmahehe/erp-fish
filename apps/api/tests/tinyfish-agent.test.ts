import { expect, test } from "bun:test";
import { RunStatus } from "@tiny-fish/sdk";
import { DEMO_PO_ID, DEMO_QUESTION_RAW, LABEL_SEPARATOR } from "shared";
import {
  AGENT_RESULT_INVALID_MESSAGE,
  AGENT_RUN_CANCELLED_MESSAGE,
  AGENT_RUN_FAILED_MESSAGE,
  AGENT_RUN_UNEXPECTED_STATUS_MESSAGE,
  mapPoRunToStepResult,
  type TinyfishRunOutcome,
} from "../src/tinyfish-result";
import { STEP_NEEDS_INPUT, STEP_OK } from "../src/orchestrator";

const SYSTEM_FAILURE_CATEGORY = "SYSTEM_FAILURE" as const;
const TUNNEL_FLAPPED_MESSAGE = "tunnel_flapped" as const;

function completed(result: Record<string, string> | null): TinyfishRunOutcome {
  return { status: RunStatus.COMPLETED, result };
}

test("completed run with a purchase order id returns ok", () => {
  const mapped = mapPoRunToStepResult(completed({ purchase_order_id: DEMO_PO_ID }));
  expect(mapped.status).toBe(STEP_OK);
  if (mapped.status === STEP_OK) {
    expect(mapped.orderId).toBe(DEMO_PO_ID);
  }
});

test("completed run with a question returns needs_input for the Q&A pause path", () => {
  const mapped = mapPoRunToStepResult(completed({ question: DEMO_QUESTION_RAW }));
  expect(mapped.status).toBe(STEP_NEEDS_INPUT);
  if (mapped.status === STEP_NEEDS_INPUT) {
    expect(mapped.question).toBe(DEMO_QUESTION_RAW);
  }
});

test("completed run with whitespace-only id and question throws invalid", () => {
  expect(() =>
    mapPoRunToStepResult(completed({ purchase_order_id: "   ", question: "  " })),
  ).toThrow(AGENT_RESULT_INVALID_MESSAGE);
});
test("completed run with empty id but a question returns needs_input", () => {
  const mapped = mapPoRunToStepResult(completed({ purchase_order_id: "", question: DEMO_QUESTION_RAW }));
  expect(mapped.status).toBe(STEP_NEEDS_INPUT);
  if (mapped.status === STEP_NEEDS_INPUT) {
    expect(mapped.question).toBe(DEMO_QUESTION_RAW);
  }
});
test("completed run with both id and question prefers the id", () => {
  const mapped = mapPoRunToStepResult(
    completed({ purchase_order_id: DEMO_PO_ID, question: DEMO_QUESTION_RAW }),
  );
  expect(mapped.status).toBe(STEP_OK);
  if (mapped.status === STEP_OK) {
    expect(mapped.orderId).toBe(DEMO_PO_ID);
  }
});

test("completed run with a null result throws invalid instead of guessing", () => {
  expect(() => mapPoRunToStepResult(completed(null))).toThrow(AGENT_RESULT_INVALID_MESSAGE);
});

test("completed run with an empty result throws invalid instead of guessing", () => {
  expect(() => mapPoRunToStepResult(completed({}))).toThrow(AGENT_RESULT_INVALID_MESSAGE);
});

test("failed run carries its category without exposing provider details", () => {
  const outcome: TinyfishRunOutcome = {
    status: RunStatus.FAILED,
    result: null,
    errorCategory: SYSTEM_FAILURE_CATEGORY,
    errorMessage: TUNNEL_FLAPPED_MESSAGE,
  };
  expect(() => mapPoRunToStepResult(outcome)).toThrow(
    [AGENT_RUN_FAILED_MESSAGE, SYSTEM_FAILURE_CATEGORY].join(
      LABEL_SEPARATOR,
    ),
  );
});

test("failed run without details throws the bare failed message", () => {
  const outcome: TinyfishRunOutcome = { status: RunStatus.FAILED, result: null };
  expect(() => mapPoRunToStepResult(outcome)).toThrow(
    new RegExp(`^${AGENT_RUN_FAILED_MESSAGE}$`),
  );
});

test("cancelled run throws cancelled", () => {
  const outcome: TinyfishRunOutcome = { status: RunStatus.CANCELLED, result: null };
  expect(() => mapPoRunToStepResult(outcome)).toThrow(AGENT_RUN_CANCELLED_MESSAGE);
});

test("non-terminal run throws unexpected status instead of invalid", () => {
  const outcome: TinyfishRunOutcome = { status: RunStatus.RUNNING, result: null };
  expect(() => mapPoRunToStepResult(outcome)).toThrow(AGENT_RUN_UNEXPECTED_STATUS_MESSAGE);
});
