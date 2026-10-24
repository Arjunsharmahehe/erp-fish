"use client";
import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT, type AgentRunView, type AgentRunRequest } from "shared";
import { useEnglishInput } from "@/components/language-provider";
import { fetchAgentRuns, fetchAgentStatus, startAgent } from "@/lib/agent-api";
import { agentUi as AGENT_UI } from "@/lib/agent-ui";
import { PLAN_API, PLAN_ROUTES, THREADS_QUERY_KEY } from "@/lib/plan-config";
import { WORKSPACE_QUERY } from "@/lib/workspace-config";
import { useActiveConversation } from "./use-planning-chat";
import type { useChatSend, useInvoice } from "./use-planning-chat";

export function useAgentRuns(threadId: string | null) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [AGENT_UI.query, threadId], enabled: threadId !== null,
    queryFn: async () => {
      const rows = await fetchAgentRuns(threadId ?? AGENT_UI.empty);
      const previous = client.getQueryData<AgentRunView[]>([AGENT_UI.query, threadId]);
      if (rows.some((row) => previous?.find((item) => item.id === row.id)?.status !== row.status)) await Promise.all([client.invalidateQueries({ queryKey: [PLAN_API.threads, threadId] }), client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory })]);
      return rows;
    },
    refetchInterval: (query) => query.state.data?.some((row) => row.status === AGENT.statuses.preparing || row.status === AGENT.statuses.running) ? AGENT_UI.pollMs : false,
  });
  const blocked = query.data?.some((row) => [AGENT.statuses.preparing, AGENT.statuses.running, AGENT.statuses.waiting, AGENT.statuses.uncertain].some((status) => status === row.status)) ?? false;
  return { query, blocked };
}
export function useAgentComposer(input: { threadId: string | null; chat: ReturnType<typeof useChatSend>; invoice: ReturnType<typeof useInvoice> }) {
  const [confirm, setConfirm] = useState(false);
  const active = useActiveConversation();
  const translate = useEnglishInput(); const client = useQueryClient(); const router = useRouter();
  const availability = useQuery({ queryKey: AGENT_UI.statusQuery, queryFn: fetchAgentStatus });
  const mutation = useMutation({
    mutationFn: async (completionMode: AgentRunRequest["completion_mode"]) => {
      const translated = await translate(input.chat.draft.trim(), { source: input.chat.draftLanguage, parts: input.chat.draftParts, interactive: true });
      if (!active.current) throw new Error(AGENT_UI.requestFailed);
      const document = input.invoice.document ?? (input.invoice.invoice ? { name: input.invoice.fileName ?? AGENT_UI.fileReady, text: JSON.stringify(input.invoice.invoice) } : undefined);
      return startAgent({ thread_id: input.threadId ?? undefined, instruction: translated.content, original: translated.original, completion_mode: completionMode, document });
    },
    onSuccess: async (run) => {
      client.setQueryData<AgentRunView[]>([AGENT_UI.query, run.thread_id], (rows) => [...(rows ?? []), run]);
      await Promise.all([client.invalidateQueries({ queryKey: THREADS_QUERY_KEY }), client.invalidateQueries({ queryKey: [PLAN_API.threads, run.thread_id] })]);
      if (!active.current) return;
      setConfirm(false); input.chat.setDraft(AGENT_UI.empty); input.invoice.claimThread(run.thread_id);
      if (!input.threadId) router.replace(`${PLAN_ROUTES.home}?thread=${encodeURIComponent(run.thread_id)}`);
    },
  });
  function submit(event: SyntheticEvent<HTMLFormElement>) { event.preventDefault(); if (input.chat.draft.trim() && !mutation.isPending) { mutation.reset(); setConfirm(true); } }
  return { confirm, setConfirm, mutation, availability, submit };
}
