import { chat } from "@tanstack/ai";
import { InvoiceJSONSchema, type ModelCredential } from "shared";
import { createModelAdapter } from "./create-model-adapter";
import type { LlmPort } from "./parse";

const PARSE_THREAD_PREFIX = "invoice-parse-" as const;
const PARSE_SYSTEM_PROMPT =
  "Return ONLY valid JSON matching {supplier, invoice_no, items[{name, qty, rate}]}. Use exact numbers. No prose." as const;
const MODEL_OPTION_RESPONSE_FORMAT = "response_format" as const;
const JSON_OBJECT_FORMAT = "json_object" as const;
const MISSING_LLM_CONFIG_MESSAGE = "missing_llm_config_openai" as const;

export function createInvoiceLlm(config?: ModelCredential): LlmPort {
  if (!config) {
    throw new Error(MISSING_LLM_CONFIG_MESSAGE);
  }
  return {
    // System prompt travels via systemPrompts: a system entry inside
    // messages is not honored as a system message on this path. json_object
    // mode because this model's endpoint rejects strict json_schema.
    completeInvoiceJson: (text: string) =>
      chat({
        adapter: createModelAdapter(config, `${PARSE_THREAD_PREFIX}${crypto.randomUUID()}`),
        systemPrompts: [PARSE_SYSTEM_PROMPT],
        messages: [{ role: "user", content: text }],
        threadId: `${PARSE_THREAD_PREFIX}${crypto.randomUUID()}`,
        modelOptions: { [MODEL_OPTION_RESPONSE_FORMAT]: { type: JSON_OBJECT_FORMAT } },
        outputSchema: InvoiceJSONSchema,
      }),
  };
}
