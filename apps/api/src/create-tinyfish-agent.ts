import {
  AuthenticationError,
  BadRequestError,
  BrowserProfile,
  RunStatus,
  TinyFish,
  type AgentRunAsyncResponse,
  type Run,
} from "@tiny-fish/sdk";
import { LABEL_SEPARATOR } from "shared";
import { env } from "./env";
import { logger } from "./logger";
import {
  AGENT_RUN_FAILED_MESSAGE,
  mapPoRunToStepResult,
  type TinyfishRunOutcome,
} from "./tinyfish-result";
import type { AgentPort, AgentStepResult } from "./types";

export {
  AGENT_RESULT_INVALID_MESSAGE,
  AGENT_RUN_CANCELLED_MESSAGE,
  AGENT_RUN_FAILED_MESSAGE,
  AGENT_RUN_UNEXPECTED_STATUS_MESSAGE,
} from "./tinyfish-result";
export type { TinyfishRunOutcome } from "./tinyfish-result";

export const AGENT_QUEUE_FAILED_MESSAGE = "agent_queue_failed" as const;
export const AGENT_POLL_TIMEOUT_MESSAGE = "agent_poll_timeout" as const;
export const AGENT_STEP_NOT_ENABLED_MESSAGE = "agent_step_not_enabled_po_only" as const;
const MISSING_TINYFISH_KEY_MESSAGE = "missing_tinyfish_api_key" as const;

const PO_APP_PATH = "/app/purchase-order" as const;
const AGENT_MAX_DURATION_SECONDS = 300 as const;
const AGENT_POLL_INTERVAL_MS = 5000 as const;
const AGENT_POLL_TIMEOUT_MS = 360000 as const;
const AGENT_MAX_POLLS = Math.ceil(AGENT_POLL_TIMEOUT_MS / AGENT_POLL_INTERVAL_MS) + 1;
const AGENT_QUEUED_LOG_MESSAGE = "agent_run_queued" as const;
const AGENT_DONE_LOG_MESSAGE = "agent_run_completed" as const;
const AGENT_POLL_RETRY_LOG_MESSAGE = "agent_poll_retry" as const;

const PO_OUTPUT_SCHEMA = {
  type: "object",
  properties: { purchase_order_id: { type: "string" } },
  required: ["purchase_order_id"],
} as const;

export interface TinyfishAgentOptions {
  profileId: string;
  erpHost: string;
  onRunId?: (runId: string) => void;
}

async function queuePoRun(
  client: TinyFish,
  options: TinyfishAgentOptions & { goal: string },
): Promise<string> {
  let queued: AgentRunAsyncResponse;
  try {
    queued = await client.agent.queue({
      goal: options.goal,
      url: `${options.erpHost}${PO_APP_PATH}`,
      browser_profile: BrowserProfile.STEALTH,
      use_profile: true,
      profile_id: options.profileId,
      use_vault: true,
      output_schema: { ...PO_OUTPUT_SCHEMA },
      // No max_steps: custom step caps need a beta entitlement on this
      // account; the duration cap alone bounds the run.
      agent_config: {
        max_duration_seconds: AGENT_MAX_DURATION_SECONDS,
      },
    });
  } catch (error) {
    const detail: string = error instanceof Error ? error.message : String(error);
    throw new Error([AGENT_QUEUE_FAILED_MESSAGE, detail].join(LABEL_SEPARATOR));
  }
  if (queued.run_id === null) {
    throw new Error(
      [AGENT_QUEUE_FAILED_MESSAGE, queued.error.message].join(LABEL_SEPARATOR),
    );
  }
  return queued.run_id;
}

function isTerminalStatus(status: string): boolean {
  return (
    status === RunStatus.COMPLETED ||
    status === RunStatus.FAILED ||
    status === RunStatus.CANCELLED
  );
}

function finishPollRun(runId: string, run: Run): AgentStepResult {
  logger.info({ runId, status: run.status }, AGENT_DONE_LOG_MESSAGE);
  const outcome: TinyfishRunOutcome = {
    status: run.status,
    result: run.result,
    errorCategory: run.error?.category,
    errorMessage: run.error?.message,
  };
  return mapPoRunToStepResult(outcome);
}

async function pollPoRun(client: TinyFish, runId: string): Promise<AgentStepResult> {
  const deadline: number = Date.now() + AGENT_POLL_TIMEOUT_MS;
  let polls = 0;
  for (;;) {
    let run: Run;
    try {
      run = await client.runs.get(runId);
    } catch (error) {
      // Transient transport blips must not kill a minutes-long run; only
      // auth and bad-request fail fast. Everything else retries to deadline.
      const fatal: boolean =
        error instanceof AuthenticationError || error instanceof BadRequestError;
      if (fatal || Date.now() >= deadline) {
        const detail: string = error instanceof Error ? error.message : String(error);
        throw new Error([AGENT_RUN_FAILED_MESSAGE, detail].join(LABEL_SEPARATOR));
      }
      logger.warn({ runId }, AGENT_POLL_RETRY_LOG_MESSAGE);
      await Bun.sleep(AGENT_POLL_INTERVAL_MS);
      continue;
    }
    polls += 1;
    if (isTerminalStatus(run.status)) {
      return finishPollRun(runId, run);
    }
    if (polls >= AGENT_MAX_POLLS || Date.now() >= deadline) {
      throw new Error(AGENT_POLL_TIMEOUT_MESSAGE);
    }
    await Bun.sleep(AGENT_POLL_INTERVAL_MS);
  }
}

async function runPoStep(
  client: TinyFish,
  options: TinyfishAgentOptions & { goal: string },
): Promise<AgentStepResult> {
  const runId: string = await queuePoRun(client, options);
  logger.info({ runId }, AGENT_QUEUED_LOG_MESSAGE);
  options.onRunId?.(runId);
  return pollPoRun(client, runId);
}

function notEnabled(): Promise<AgentStepResult> {
  return Promise.reject(new Error(AGENT_STEP_NOT_ENABLED_MESSAGE));
}

// PO-only first slice: SO/Stock reject loudly until their slices land.
// The mapper in tinyfish-result.ts holds all branching logic
// (unit-tested); this shell stays thin and is verified by the live run.
export interface TinyfishAgent extends AgentPort {
  drainRunIds: () => string[];
}

export function createTinyfishAgent(options: TinyfishAgentOptions): TinyfishAgent {
  const apiKey: string | undefined = env.TINYFISH_API_KEY;
  if (apiKey === undefined) {
    throw new Error(MISSING_TINYFISH_KEY_MESSAGE);
  }
  const client = new TinyFish({ apiKey });
  const runIds: string[] = [];
  const recordRunId = (runId: string): void => {
    runIds.push(runId);
    options.onRunId?.(runId);
  };
  return {
    runPurchaseOrder: (input: { goal: string }) =>
      runPoStep(client, { ...options, goal: input.goal, onRunId: recordRunId }),
    runSalesOrder: notEnabled,
    runStockEntry: notEnabled,
    drainRunIds: () => runIds.splice(0, runIds.length),
  };
}
