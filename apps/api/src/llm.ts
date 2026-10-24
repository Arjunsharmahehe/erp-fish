import { chat } from "@tanstack/ai";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { InvoiceJSONSchema } from "shared";
import { env } from "./env";
import type { LlmPort } from "./parse";

const PARSE_THREAD_PREFIX = "invoice-parse-" as const;
const PARSE_SYSTEM_PROMPT =
  "Return ONLY valid JSON matching {supplier, invoice_no, items[{name, qty, rate}]}. Use exact numbers. No prose." as const;
const SYSTEM_MESSAGE_ID = "invoice-parse-system" as const;
const USER_MESSAGE_ID = "invoice-parse-user" as const;
const MISSING_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

export function createInvoiceLlm(): LlmPort {
  const baseURL: string | undefined = env.OPENAI_BASE_URL;
  const apiKey: string | undefined = env.OPENAI_API_KEY;
  const model: string | undefined = env.OPENAI_MODEL;
  if (baseURL === undefined || apiKey === undefined || model === undefined) {
    throw new Error(MISSING_LLM_CONFIG_MESSAGE);
  }
  return {
    completeInvoiceJson: (text: string) =>
      chat({
        adapter: openaiCompatibleText(model, { baseURL, apiKey }),
        messages: [
          {
            id: SYSTEM_MESSAGE_ID,
            role: "system",
            parts: [{ type: "text", content: PARSE_SYSTEM_PROMPT }],
          },
          { id: USER_MESSAGE_ID, role: "user", parts: [{ type: "text", content: text }] },
        ],
        threadId: `${PARSE_THREAD_PREFIX}${crypto.randomUUID()}`,
        outputSchema: InvoiceJSONSchema,
      }),
  };
}
