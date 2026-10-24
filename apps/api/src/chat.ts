import {
  ChatResultSchema,
  SPACE,
  type ChatMessage,
  type ChatResult,
  type InvoiceJSON,
} from "shared";
import { logger } from "./logger";

export const FETCH_URL_TOOL = "fetch_url" as const;
export const FETCH_URL_TOOL_DESCRIPTION = "Fetch a URL and return its content." as const;
export const WEB_SEARCH_TOOL = "web_search" as const;
export const WEB_SEARCH_TOOL_DESCRIPTION = "Search the web and return results." as const;

const PLANNING_SYSTEM_PROMPT =
  `You are a planning assistant for ERP invoice processing. Answer questions about the attached invoice. When the question needs facts beyond the invoice, call ${WEB_SEARCH_TOOL} to find sources and ${FETCH_URL_TOOL} to read them, then answer with invoice values and browsed facts. Reply with ONLY a JSON object with keys message and citations, no prose or fences. Put every browsed source URL in citations.` as const;
const INVOICE_CONTEXT_LABEL = "Invoice context:" as const;
const BROWSING_UNAVAILABLE_NOTE =
  "Web browsing is unavailable in this environment; answer from the invoice context only." as const;
const CHAT_DEGRADED_MESSAGE =
  "I cannot browse the web or reach a model in this environment yet, so I cannot answer. Configure the OpenAI-compatible model and TinyFish keys to enable planning chat." as const;
const PLAN_CHAT_LOG_MESSAGE = "plan_chat_completed" as const;

export interface ChatToolSpec {
  name: string;
  description: string;
}

export interface PlanChatRequest {
  system: string;
  messages: ChatMessage[];
  tools: ChatToolSpec[];
}

export interface PlanChatLlmPort {
  completePlanningChat: (request: PlanChatRequest) => Promise<ChatResult>;
}

export interface PlanChatInput {
  messages: ChatMessage[];
  invoice?: InvoiceJSON;
}

export interface PlanChatDeps {
  llm: PlanChatLlmPort | undefined;
  toolsAvailable: boolean;
}

function buildSystemPrompt(invoice: InvoiceJSON | undefined, toolsAvailable: boolean): string {
  const sections: string[] = [PLANNING_SYSTEM_PROMPT];
  if (invoice !== undefined) {
    sections.push(`${INVOICE_CONTEXT_LABEL} ${JSON.stringify(invoice)}`);
  }
  if (!toolsAvailable) {
    sections.push(BROWSING_UNAVAILABLE_NOTE);
  }
  return sections.join(SPACE);
}

function availableTools(toolsAvailable: boolean): ChatToolSpec[] {
  if (!toolsAvailable) {
    return [];
  }
  return [
    { name: FETCH_URL_TOOL, description: FETCH_URL_TOOL_DESCRIPTION },
    { name: WEB_SEARCH_TOOL, description: WEB_SEARCH_TOOL_DESCRIPTION },
  ];
}

export async function planChat(input: PlanChatInput, deps: PlanChatDeps): Promise<ChatResult> {
  if (deps.llm === undefined) {
    return { message: CHAT_DEGRADED_MESSAGE, citations: [] };
  }
  const result = await deps.llm.completePlanningChat({
    system: buildSystemPrompt(input.invoice, deps.toolsAvailable),
    messages: input.messages,
    tools: availableTools(deps.toolsAvailable),
  });
  const parsed: ChatResult = ChatResultSchema.parse(result);
  logger.info({ toolsAvailable: deps.toolsAvailable }, PLAN_CHAT_LOG_MESSAGE);
  return parsed;
}
