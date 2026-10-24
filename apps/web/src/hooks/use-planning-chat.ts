"use client";

import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { loadThread, parseInvoice, sendChat, type ChatMessage, type Invoice, type ThreadSummary } from "@/lib/plan-api";
import { PLAN_API, PLAN_COPY, PLAN_LIMITS, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";

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

  const current = owner === threadId;
  return {
    invoice: current ? invoice : null,
    fileName: current ? fileName : null,
    parsing: current && parsing,
    error: current ? error : null,
    attachFile,
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
      { id: options.threadId, title: options.title, created_at: new Date().toISOString() },
      ...(current ?? []).filter((thread) => thread.id !== options.threadId),
    ]);
  }
}

export function useChatSend(options: { threadId: string | null; invoice: Invoice | null; claimInvoice: (id: string) => void }) {
  const { threadId, invoice, claimInvoice } = options;
  const router = useRouter();
  const queryClient = useQueryClient();
  const thread = useQuery({ queryKey: [PLAN_API.threads, threadId], queryFn: () => loadThread(threadId ?? ""), enabled: threadId !== null });
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useActiveConversation();
  const messages = [...(thread.data ?? []), ...localMessages];
  const blocked = sending || (threadId !== null && thread.isPending);

  async function send(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || blocked) return;
    const next: ChatMessage = { role: "user", content };
    setLocalMessages((current) => [...current, next]);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      const response = await sendChat({ messages: [...messages, next], threadId, invoice });
      const reply: ChatMessage = { role: "assistant", content: response.message };
      const accepted = [...messages, next, reply];
      await cacheAcceptedReply(queryClient, { threadId: response.thread_id, messages: accepted, title: content, isNew: threadId === null });
      if (!active.current) return;
      setLocalMessages(threadId ? [] : accepted);
      if (!threadId) {
        if (invoice) claimInvoice(response.thread_id);
        router.replace(`${PLAN_ROUTES.home}?thread=${encodeURIComponent(response.thread_id)}`);
      }
    } catch (error) {
      if (active.current) setError(error instanceof Error ? error.message : PLAN_COPY.chatFailed);
    } finally {
      setSending(false);
    }
  }

  return { messages, draft, setDraft, sending, error, thread, send };
}
