import { chat } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { ChatResultSchema } from "shared";
import type { PlanChatLlmPort, PlanChatRequest } from "./chat";
import { createPlanningTools } from "./create-planning-tools";
import { env } from "./env";

const CHAT_THREAD_PREFIX = "plan-chat-" as const;
const SYSTEM_MESSAGE_ID = "plan-chat-system" as const;
const HISTORY_MESSAGE_PREFIX = "plan-chat-history-" as const;
export const MISSING_CHAT_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

export function createChatLlm(): PlanChatLlmPort {
  const baseURL: string | undefined = env.OPENAI_BASE_URL;
  const apiKey: string | undefined = env.OPENAI_API_KEY;
  const model: string | undefined = env.OPENAI_MODEL;
  if (baseURL === undefined || apiKey === undefined || model === undefined) {
    throw new Error(MISSING_CHAT_LLM_CONFIG_MESSAGE);
  }
  return {
    // Agentic structured output: the model may call the TinyFish-backed
    // tools (empty without keys) before returning the validated answer.
    // createPlanningTools reads the same TINYFISH_API_KEY gate as the
    // planChat toolsAvailable flag, so the two never disagree.
    completePlanningChat: (request: PlanChatRequest) =>
      chat({
        adapter: openaiCompatibleText(model, { baseURL, apiKey }),
        messages: [
          {
            id: SYSTEM_MESSAGE_ID,
            role: "system",
            parts: [{ type: "text", content: request.system }],
          },
          ...request.messages.map((message, index) => ({
            id: `${HISTORY_MESSAGE_PREFIX}${String(index)}`,
            role: message.role,
            content: message.content,
          })),
        ],
        threadId: `${CHAT_THREAD_PREFIX}${crypto.randomUUID()}`,
        tools: createPlanningTools(),
        outputSchema: ChatResultSchema,
      }),
  };
}
