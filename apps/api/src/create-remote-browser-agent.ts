import { BrowserProfile, RunStatus, TinyFish } from "@tiny-fish/sdk";
import { AGENT, LEARNING, AgentBrowserResultSchema } from "shared";
import type { BrowserAgentPort } from "./browser-agent-port";
import { prepareTinyfishSession } from "./prepare-tinyfish-session";

const CONFIG_TIMEOUT = 30000;
const CONFIG_DURATION_SECONDS = 600;
const REMOTE = Object.freeze({ timeout: CONFIG_TIMEOUT, retries: 0, durationSeconds: CONFIG_DURATION_SECONDS });
const POLICY_REJECTION = "usage polic";
const RESULT_SCHEMA = {
  type: "object", required: ["status", "summary", "records"], properties: {
    status: { type: "string", enum: ["completed", "needs_input"] }, summary: { type: "string" }, question: { type: "string" },
    choices: { type: "array", maxItems: LEARNING.maxChoices, items: { type: "string" } },
    memory: { type: "object", properties: { question: { type: "string" }, context: { type: "string" } } },
    records: { type: "array", items: { type: "object", required: ["type", "id", "state"], properties: { type: { type: "string" }, id: { type: "string" }, state: { type: "string", enum: ["draft", "submitted", "existing"] }, url: { type: "string" } } } },
  },
};
export function createRemoteBrowserAgent(apiKey: string): BrowserAgentPort {
  const client = new TinyFish({ apiKey, maxRetries: REMOTE.retries, timeout: REMOTE.timeout });
  return {
    prepare: (input) => prepareTinyfishSession({ client, apiKey }, input),
    start: async ({ erpUrl, goal, session }) => {
      const queued = await client.agent.queue({ url: erpUrl, goal, use_profile: true, profile_id: session.profileId, use_vault: true, credential_item_ids: [session.credentialReference], browser_profile: BrowserProfile.STEALTH, output_schema: RESULT_SCHEMA, agent_config: { max_duration_seconds: REMOTE.durationSeconds } });
      if (!queued.run_id) throw new Error(AGENT.uncertain);
      return queued.run_id;
    },
    inspect: async (runId) => {
      const run = await client.runs.get(runId);
      if (run.status === RunStatus.PENDING || run.status === RunStatus.RUNNING) return { status: "running" };
      if (run.status !== RunStatus.COMPLETED) return { status: "failed", error: run.error?.message.toLowerCase().includes(POLICY_REJECTION) ? AGENT.providerRejected : AGENT.invalidResult };
      const parsed = AgentBrowserResultSchema.safeParse(run.result);
      if (!parsed.success) return { status: "failed", error: AGENT.invalidResult };
      return { status: "completed", result: parsed.data };
    },
  };
}
