import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { MODEL_SETTINGS, type ModelCredential } from "shared";
import { createModelFetch } from "./create-model-fetch";

const CLIENT = Object.freeze({ agent: "erp-fish-plan-mode", agentHeader: "User-Agent", sessionHeader: "x-opencode-session", first: 0, retries: 0 });
export function createModelAdapter(config: ModelCredential, sessionId: string) {
  return openaiCompatibleText(config.model, {
    baseURL: config.completion_url.slice(CLIENT.first, -MODEL_SETTINGS.completionSuffix.length),
    apiKey: config.api_key, fetch: createModelFetch(config.completion_url), maxRetries: CLIENT.retries,
    defaultHeaders: { [CLIENT.agentHeader]: CLIENT.agent, [CLIENT.sessionHeader]: sessionId },
  });
}
