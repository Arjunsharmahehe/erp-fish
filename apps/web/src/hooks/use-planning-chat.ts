"use client";
import { useEnglishInput } from "@/components/language-provider";
import { useMessageDraft } from "@/hooks/use-message-draft";

import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { loadThread, parseInvoice, type ChatMessage, type Invoice, type ThreadSummary } from "@/lib/plan-api";
import { CHAT_ACTIVITY, type ChatActivity } from "shared";
import { sendChatStream } from "@/lib/send-chat-stream";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { INVOICE_FILE, PLAN_API, PLAN_COPY, PLAN_LIMITS, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";

export function useInvoice(threadId: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const parseRequest = useRef(PLAN_LIMITS.firstStep);

  async function attachFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.item(PLAN_LIMITS.firstStep);
    if (!file) return;
    event.target.value = INVOICE_FILE.emptyInput;
    parseRequest.current += PLAN_LIMITS.nextOccurrence;
    const request = parseRequest.current;
    setOwner(threadId);
    setInvoice(null);
    setFileName(file.name);
    setParsing(true);
    setError(null);
    try {
      const parsed = await parseInvoice(file);
      if (request === parseRequest.current) setInvoice(parsed);
    } catch (error) {
      if (request === parseRequest.current) {
        setInvoice(null);
        setError(error instanceof Error ? error.message : PLAN_COPY.parseFailed);
      }
    } finally {
      if (request === parseRequest.current) setParsing(false);
    }
  }

  function removeAttachment() {
    parseRequest.current += PLAN_LIMITS.nextOccurrence;
    setInvoice(null);
    setFileName(null);
    setParsing(false);
    setError(null);
    setOwner(null);
  }

  const current = owner === threadId;
  return {
    invoice: current ? invoice : null,
    fileName: current ? fileName : null,
    parsing: current && parsing,
    error: current ? error : null,
    attachFile,
    removeAttachment,
    claimThread: (id: string) => { setOwner(id); },
  };
}

function useActiveConversation() {
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

function useOpenThread(options: { invoice: Invoice | null; claimInvoice: (id: string) => void }) {
  const router = useRouter();
  return function openThread(id: string) {
    if (options.invoice) options.claimInvoice(id);
    router.replace(`${PLAN_ROUTES.home}?thread=${encodeURIComponent(id)}`);
  };
}
export function useChatSend(options: { threadId: string | null; invoice: Invoice | null; claimInvoice: (id: string) => void }) {
  const englishInput = useEnglishInput();
  const { threadId, invoice } = options;
  const openThread = useOpenThread(options);
  const queryClient = useQueryClient();
  const thread = useQuery({ queryKey: [PLAN_API.threads, threadId], queryFn: () => loadThread(threadId ?? ""), enabled: threadId !== null });
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [activity, setActivity] = useState<ChatActivity[]>([]);
  const { draft, draftLanguage, draftParts, setDraft, replaceDraft, setVoiceDraft } = useMessageDraft();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useActiveConversation();
  const isActive = () => active.current;
  const messages = [...(thread.data ?? []), ...localMessages];
  const blocked = sending || (threadId !== null && thread.isPending);

  async function send(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || blocked) return;
    setError(null);
    setSending(true);
    setActivity([]);
    try {
      const translated = await englishInput(content, { source: draftLanguage, parts: draftParts, interactive: true });
      if (!isActive()) return;
      const next: ChatMessage = { role: "user", ...translated };
      setLocalMessages((current) => [...current, next]);
      setDraft("");
      const response = await sendChatStream({ messages: [...messages, next], threadId, invoice, onActivity: (step) => {
        if (active.current) setActivity((current) => current.some((item) => item.id === step.id) ? current.map((item) => item.id === step.id ? step : item) : [...current, step]);
      } });
      const reply: ChatMessage = { role: "assistant", content: response.message, activity: response.activity, citations: response.citations };
      const accepted = [...messages, next, reply];
      await cacheAcceptedReply(queryClient, { threadId: response.thread_id, messages: accepted, title: content, isNew: threadId === null });
      if (!active.current) return;
      setActivity([]);
      setLocalMessages(threadId ? [] : accepted);
      if (!threadId) openThread(response.thread_id);
    } catch (error) {
      if (active.current) {
        setError(error instanceof Error ? error.message : PLAN_COPY.chatFailed);
        setActivity((current) => current.map((step) => step.status === CHAT_ACTIVITY.running ? { ...step, status: CHAT_ACTIVITY.error } : step));
      }
    } finally {
      setSending(false);
    }
  }

  return { messages, draft, setDraft, replaceDraft, setVoiceDraft, sending, error, thread, send, activity };
}
