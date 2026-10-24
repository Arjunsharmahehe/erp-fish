import { fetchServerSentEvents } from "@tanstack/ai-react";
import { EventType } from "@tanstack/ai";
import { CHAT_STREAM, ChatActivitySchema, ChatRequestSchema, ChatResponseSchema, type ChatActivity, type ChatMessage, type ChatResponse, type InvoiceJSON } from "shared";
import { api } from "@/lib/api";
import { PLAN_COPY, PLAN_MODE } from "@/lib/plan-config";

interface ChatStreamOptions {
  messages: ChatMessage[];
  threadId: string | null;
  invoice: InvoiceJSON | null;
  onAccepted: () => void;
  onActivity: (activity: ChatActivity) => void;
}

function streamRequest(options: ChatStreamOptions) {
  return ChatRequestSchema.parse({
    messages: options.messages.map(({ role, content, original, attachment }) => ({ role, content, original, attachment })),
    mode: PLAN_MODE.planning,
    ...(options.threadId ? { thread_id: options.threadId } : {}),
    ...(options.invoice ? { invoice: options.invoice } : {}),
  });
}
export async function sendChatStream(options: ChatStreamOptions): Promise<ChatResponse> {
  const connection = fetchServerSentEvents(api.api.chat.stream.$url().href, {
    body: streamRequest(options),
    credentials: "include",
  });
  let response: ChatResponse | undefined;
  let accepted = false;
  for await (const chunk of connection.connect([], undefined, undefined, { threadId: options.threadId ?? crypto.randomUUID(), runId: crypto.randomUUID() })) {
    if (!accepted) { accepted = true; options.onAccepted(); }
    if (chunk.type === EventType.RUN_ERROR) throw new Error(PLAN_COPY.chatFailed);
    if (chunk.type !== CHAT_STREAM.custom) continue;
    if (chunk.name === CHAT_STREAM.activity) options.onActivity(ChatActivitySchema.parse(chunk.value));
    if (chunk.name === CHAT_STREAM.answer) response = ChatResponseSchema.parse(chunk.value);
  }
  if (!response) throw new Error(PLAN_COPY.chatFailed);
  return response;
}
