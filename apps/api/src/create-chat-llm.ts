import { chat } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { ChatResultSchema } from "shared";
import type { PlanChatLlmPort, PlanChatRequest } from "./chat";
import { createPlanningTools } from "./create-planning-tools";
import { env } from "./env";
import { createChatProgress, type ActivityListener } from "./chat-progress";
import { createLearningTools, type LearningToolContext } from "./learning-tools";

const CHAT_THREAD_PREFIX = "plan-chat-" as const;
const HISTORY_MESSAGE_PREFIX = "plan-chat-history-" as const;
const CLIENT_USER_AGENT = "erp-fish-plan-mode" as const;
const CLIENT_USER_AGENT_HEADER = "User-Agent" as const;
const OPENCODE_SESSION_HEADER = "x-opencode-session" as const;
const MODEL_OPTION_RESPONSE_FORMAT = "response_format" as const;
const JSON_OBJECT_FORMAT = "json_object" as const;
export const MISSING_CHAT_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

export function createChatLlm(options: { sessionId: string; onActivity?: ActivityListener; learning?: LearningToolContext }): PlanChatLlmPort {
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
        adapter: openaiCompatibleText(model, {
          baseURL,
          apiKey,
          defaultHeaders: {
            [CLIENT_USER_AGENT_HEADER]: CLIENT_USER_AGENT,
            [OPENCODE_SESSION_HEADER]: options.sessionId,
          },
        }),
        // System prompt travels via systemPrompts: a system entry inside
        // messages is not honored as a system message on this path.
        systemPrompts: [request.system],
        messages: [
          ...request.messages.map((message, index) => ({
            id: `${HISTORY_MESSAGE_PREFIX}${String(index)}`,
            role: message.role,
            content: message.content,
          })),
        ],
        threadId: `${CHAT_THREAD_PREFIX}${crypto.randomUUID()}`,
        tools: [...createPlanningTools(), ...(options.learning ? createLearningTools(options.learning) : [])],
        middleware: options.onActivity ? [createChatProgress(options.onActivity)] : [],
        // Go DeepSeek path rejects strict json_schema; json_object mode
        // still validates the parsed object against outputSchema.
        modelOptions: { [MODEL_OPTION_RESPONSE_FORMAT]: { type: JSON_OBJECT_FORMAT } },
        outputSchema: ChatResultSchema,
      }),
  };
}
