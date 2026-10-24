import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { TASK_KIND_PO } from "shared";
import { createDemoAgent, MISSING_DEMO_CONFIG_MESSAGE } from "./demoAgent";
import { createTinyfishAgent, type TinyfishAgent } from "./create-tinyfish-agent";
import { findTaskRows, updateTaskRunId } from "./db";
import { DEMO_AGENT_ON, env } from "./env";
import { logger } from "./logger";
import type { AgentPort } from "./types";

const SERVICE_UNAVAILABLE_STATUS = 503 as const;
const PERSIST_RUN_ID_WARN_MESSAGE = "persist_run_id_skipped" as const;

function requireDemoAgent(instruction: string) {
  if (env.DEMO_AGENT !== DEMO_AGENT_ON) {
    throw new HTTPException(SERVICE_UNAVAILABLE_STATUS, {
      message: MISSING_DEMO_CONFIG_MESSAGE,
    });
  }
  return createDemoAgent(instruction);
}

function isTinyfishAgent(agent: AgentPort): agent is TinyfishAgent {
  return "drainRunIds" in agent && typeof agent.drainRunIds === "function";
}

function firstRecordedRunId(agent: AgentPort): string | undefined {
  if (!isTinyfishAgent(agent)) {
    return undefined;
  }
  const drained: unknown = agent.drainRunIds();
  if (!Array.isArray(drained)) {
    return undefined;
  }
  const first: unknown = drained.length > 0 ? drained[0] : undefined;
  return typeof first === "string" ? first : undefined;
}

// PO-only slice: persists the recorded run on the PO task. SO/Stock slices
// extend this to their kinds when they land. Never fails the request: the
// job already succeeded, so a persistence miss is only logged.
export function persistPoRunId(options: {
  db: Database;
  jobId: string;
  agent: AgentPort;
}): void {
  const runId: string | undefined = firstRecordedRunId(options.agent);
  if (runId === undefined) {
    return;
  }
  const poTask = findTaskRows(options.db, options.jobId).find(
    (task) => task.kind === TASK_KIND_PO,
  );
  if (poTask === undefined) {
    return;
  }
  try {
    updateTaskRunId(options.db, { taskId: poTask.id, runId });
  } catch {
    logger.warn({ jobId: options.jobId, taskId: poTask.id }, PERSIST_RUN_ID_WARN_MESSAGE);
  }
}

// Blank stored strings behave as missing so they fall back to the client
// value instead of 500ing downstream on the non-null row contract.
export function storedOrNull(value: string | null): string | null {
  if (value === null || value.trim() === "") {
    return null;
  }
  return value;
}

// Session values win; client values are the fallback so pre-onboarding demo
// flows keep working. The REAL agent fires on stored values only: a client
// must never trigger wallet spend by sending a profile_id (that restriction
// lifts once onboarding persists profile_id and the fallback is removed).
export function resolveJobAgent(request: {
  erpHost: string;
  profileId: string;
  instruction: string;
  allowReal: boolean;
}): AgentPort {
  if (request.allowReal && env.TINYFISH_API_KEY !== undefined) {
    return createTinyfishAgent({ profileId: request.profileId, erpHost: request.erpHost });
  }
  return requireDemoAgent(request.instruction);
}
