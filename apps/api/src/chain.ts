import {
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_WAITING,
  TASK_KIND_PO,
  TASK_KIND_SO,
  TASK_KIND_STOCK,
  type AgentResultIds,
  type JobInput,
  type JobView,
  type TaskKind,
} from "shared";
import { updateJobResultIds, updateJobStatus } from "./db";
import { EVENT_COMPLETED, EVENT_FAILED, type EmitFn, type JobEvent } from "./events";
import { logger } from "./logger";
import { createStepDefs } from "./create-step-defs";
import { toView } from "./queries";
import { runChainStep } from "./run-chain-step";
import { resolveSiteProfile, type SiteProfile } from "./site";
import type { ChainStep, OrchestratorDeps, StepDef } from "./types";

const JOB_LOG_MESSAGE = "job_transition" as const;

// Frappe default for direct orchestrator callers; routes pass a site.
function jobSite(deps: OrchestratorDeps, erpHost: string): SiteProfile {
  return deps.site ?? resolveSiteProfile(erpHost, null);
}

const COLLECTED_KEY_BY_KIND: Record<
  TaskKind,
  "purchase_order_id" | "sales_order_id" | "stock_entry_id"
> = {
  [TASK_KIND_PO]: "purchase_order_id",
  [TASK_KIND_SO]: "sales_order_id",
  [TASK_KIND_STOCK]: "stock_entry_id",
};

export function makeEmit(deps: OrchestratorDeps): EmitFn {
  return (event: Omit<JobEvent, "at">): void => {
    const stamped: JobEvent = { ...event, at: new Date().toISOString() };
    logger.info(
      {
        jobId: stamped.jobId,
        taskId: stamped.taskId,
        type: stamped.type,
        orderId: stamped.orderId,
        reason: stamped.reason,
        at: stamped.at,
      },
      JOB_LOG_MESSAGE,
    );
    deps.onEvent?.(stamped);
  };
}

function haltJob(
  deps: OrchestratorDeps,
  request: {
    jobId: string;
    collected: AgentResultIds;
    status: typeof JOB_STATUS_WAITING | typeof JOB_STATUS_FAILED;
  },
): JobView {
  updateJobResultIds(deps.db, { jobId: request.jobId, resultIds: request.collected });
  updateJobStatus(deps.db, { jobId: request.jobId, status: request.status });
  return toView(deps.db, request.jobId);
}

export async function runStepsFrom(
  deps: OrchestratorDeps,
  request: {
    parsed: JobInput;
    learned: string;
    jobId: string;
    emit: EmitFn;
    collected: AgentResultIds;
    resume: { index: number; taskId: string | undefined };
  },
): Promise<JobView> {
  const defs: StepDef[] = createStepDefs({
    agent: deps.agent,
    parsed: request.parsed,
    learned: request.learned,
    collected: request.collected,
    site: jobSite(deps, request.parsed.erp_host),
  });
  try {
    let resumedTaskId: string | undefined = request.resume.taskId;
    for (const step of defs.slice(request.resume.index)) {
      const outcome: ChainStep = await runChainStep(deps, {
        parsed: request.parsed,
        jobId: request.jobId,
        emit: request.emit,
        step,
        resumedTaskId,
      });
      resumedTaskId = undefined;
      if (outcome.finished) {
        return haltJob(deps, {
          jobId: request.jobId,
          collected: request.collected,
          status: outcome.status,
        });
      }
      request.collected[COLLECTED_KEY_BY_KIND[step.kind]] = outcome.orderId;
    }
  } catch (error) {
    const reason: string = error instanceof Error ? error.message : String(error);
    updateJobStatus(deps.db, { jobId: request.jobId, status: JOB_STATUS_FAILED });
    request.emit({ type: EVENT_FAILED, jobId: request.jobId, reason });
    logger.error({ jobId: request.jobId, reason }, JOB_LOG_MESSAGE);
    return toView(deps.db, request.jobId);
  }
  updateJobResultIds(deps.db, { jobId: request.jobId, resultIds: request.collected });
  updateJobStatus(deps.db, { jobId: request.jobId, status: JOB_STATUS_DONE });
  request.emit({ type: EVENT_COMPLETED, jobId: request.jobId });
  return toView(deps.db, request.jobId);
}
