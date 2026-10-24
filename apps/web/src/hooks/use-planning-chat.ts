"use client";
import { useEnglishInput } from "@/components/language-provider";
import { useMessageDraft } from "@/hooks/use-message-draft";

import { useEffect, useRef, useState, type RefObject, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { loadThread, type ChatMessage, type ThreadSummary } from "@/lib/plan-api";
import type { useInvoice } from "./use-invoice";
import { CHAT_ACTIVITY, type ChatActivity } from "shared";


import { sendChatStream } from "@/lib/send-chat-stream";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { PLAN_API, PLAN_COPY, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";

export { useInvoice } from "./use-invoice";
export function useActiveConversation() {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  return active;
}

async function cacheAcceptedReply(client: QueryClient, options: { threadId: string; messages: ChatMessage[]; title: string; isNew: boolean }) {
  await client.cancelQueries({ queryKey: [PLAN_API.threads, options.threadId] });
  client.setQueryData<ChatMessage[]>([PLAN_API.threads, options.threadId], options.messages);
  if (options.isNew) {
    client.setQueryData<ThreadSummary[]>(THREADS_QUERY_KEY, (current) => [
      { id: options.threadId, title: options.title, created_at: new Date().toISOString(), pinned: false, archived: false },
      ...(current ?? []).filter((thread) => thread.id !== options.threadId),
    ]);
  }
  await client.invalidateQueries({ queryKey: [WORKSPACE_QUERY.questions, options.threadId] });
  await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory });
}

function useChatFeedback(active: RefObject<boolean>) {
  const [activity, setActivity] = useState<ChatActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  function report(step: ChatActivity) {
    if (active.current) setActivity((current) => current.some((item) => item.id === step.id) ? current.map((item) => item.id === step.id ? step : item) : [...current, step]);
  }
  function fail(cause: unknown) {
    if (!active.current) return;
    setError(cause instanceof Error ? cause.message : PLAN_COPY.chatFailed);
    setActivity((current) => current.map((step) => step.status === CHAT_ACTIVITY.running ? { ...step, status: CHAT_ACTIVITY.error } : step));
  }
  function reset() { setError(null); setActivity([]); }
  return { activity, error, report, fail, reset };
}

export function useChatSend(options: { threadId: string | null; invoice: ReturnType<typeof useInvoice> }) {
  const englishInput = useEnglishInput();
  const { threadId } = options;
  const router = useRouter();
  const queryClient = useQueryClient();
  const thread = useQuery({ queryKey: [PLAN_API.threads, threadId], queryFn: () => loadThread(threadId ?? ""), enabled: threadId !== null });
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const { draft, draftLanguage, draftParts, setDraft, replaceDraft, setVoiceDraft } = useMessageDraft();
  const [sending, setSending] = useState(false);
  const active = useActiveConversation();
  const feedback = useChatFeedback(active);
  const isActive = () => active.current;
  const messages = [...(thread.data ?? []), ...localMessages];
  const blocked = sending || (threadId !== null && thread.isPending);

  async function send(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || blocked) return;
    const invoice = options.invoice.invoice;
    const attachment = invoice && options.invoice.fileName ? { name: options.invoice.fileName } : undefined;
    feedback.reset();
    setSending(true);
    try {
      const translated = await englishInput(content, { source: draftLanguage, parts: draftParts, interactive: true });
      if (!isActive()) return;
      const next: ChatMessage = { role: "user", ...translated, attachment };
      const response = await sendChatStream({ messages: [...messages, next], threadId, invoice, onAccepted: () => {
        if (!active.current) return;
        setLocalMessages((current) => [...current, next]);
        setDraft("");
        options.invoice.consumeAttachment();
      }, onActivity: feedback.report });
      const reply: ChatMessage = { role: "assistant", content: response.message, activity: response.activity, citations: response.citations };
      const accepted = [...messages, next, reply];
      await cacheAcceptedReply(queryClient, { threadId: response.thread_id, messages: accepted, title: content, isNew: threadId === null });
      if (!active.current) return;
      feedback.reset();
      setLocalMessages(threadId ? [] : accepted);
      if (!threadId) {
        options.invoice.claimThread(response.thread_id);
        router.replace(`${PLAN_ROUTES.home}?thread=${encodeURIComponent(response.thread_id)}`);
      }
    } catch (error) {
      feedback.fail(error);
    } finally {
      setSending(false);
    }
  }

  return { messages, draft, draftLanguage, draftParts, setDraft, replaceDraft, setVoiceDraft, sending, error: feedback.error, thread, send, activity: feedback.activity };
}
