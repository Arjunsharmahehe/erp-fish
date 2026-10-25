import { chat, maxIterations, toolDefinition } from "@tanstack/ai";
import { AgentBrowserResultSchema, BrowserActionSchema, BrowserToolInputSchema, BROWSER, type ModelCredential } from "shared";
import { actInBrowser, type LocalBrowserPage } from "./local-browser-actions";
import { localBrowserConfig as CONFIG } from "./local-browser-config";
import { createModelAdapter } from "./create-model-adapter";
import { logger } from "./logger";

const RESPONSE_FORMAT = { response_format: { type: "json_object" } };
const KNOWN_ERRORS = new Set<string>([BROWSER.scope, BROWSER.stale, BROWSER.credentialField, BROWSER.draftBlocked]);
const START = "Inspect the connected ERP and carry out the requested task under the stated completion policy.";
export async function runLocalBrowserModel(input: { runtime: LocalBrowserPage; config: ModelCredential; goal: string; runId: string; jobId: string; controller: AbortController }) {
  let chain = Promise.resolve();
  const browser = toolDefinition({ name: CONFIG.toolName, description: CONFIG.toolDescription, inputSchema: BrowserToolInputSchema }).server((rawAction) => {
    const action = BrowserActionSchema.parse(rawAction);
    const result = chain.then(async () => {
      input.controller.signal.throwIfAborted();
      logger.info({ jobId: input.jobId, runId: input.runId, action: action.action }, CONFIG.logStep);
      try { return await actInBrowser(input.runtime, action); }
      catch (error) {
        input.controller.signal.throwIfAborted();
        if (error instanceof Error && KNOWN_ERRORS.has(error.message)) return { error: error.message };
        // A timeout may occur after a click has saved data. Stop instead of retrying a possibly applied write.
        input.controller.abort(BROWSER.unavailable);
        throw error;
      }
    });
    chain = result.then(() => undefined, () => undefined);
    return result;
  });
  return chat({
    // Provider error payloads can include page content; report sanitized failures in the runtime.
    debug: false,
    adapter: createModelAdapter(input.config, input.runId),
    systemPrompts: [CONFIG.instructions, input.goal], messages: [{ role: "user", content: START }],
    threadId: input.runId, tools: [browser], agentLoopStrategy: maxIterations(CONFIG.maxTurns), abortController: input.controller,
    modelOptions: RESPONSE_FORMAT, outputSchema: AgentBrowserResultSchema,
  });
}
