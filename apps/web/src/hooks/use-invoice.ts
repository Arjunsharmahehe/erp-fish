"use client";
import { useRef, useState, type ChangeEvent } from "react";
import type { z } from "zod";
import type { AgentDocumentSchema } from "shared";
import { parseInvoice, type Invoice } from "@/lib/plan-api";
import { parseAgentDocument } from "@/lib/agent-api";
import { INVOICE_FILE, PLAN_COPY, PLAN_LIMITS } from "@/lib/plan-config";

interface AttachmentState { invoice: Invoice | null; document: z.infer<typeof AgentDocumentSchema> | null; fileName: string | null; owner: string | null; parsing: boolean; error: string | null }
const EMPTY: AttachmentState = { invoice: null, document: null, fileName: null, owner: null, parsing: false, error: null };
async function parseAttachment(file: File, agentMode: boolean) {
  return agentMode ? { invoice: null, document: await parseAgentDocument(file) } : { invoice: await parseInvoice(file), document: null };
}
export function useInvoice(threadId: string | null) {
  const [state, setState] = useState(EMPTY);
  const parseRequest = useRef(PLAN_LIMITS.firstStep);
  async function attachFile(event: ChangeEvent<HTMLInputElement>, agentMode = false) {
    const file = event.target.files?.item(PLAN_LIMITS.firstStep);
    if (!file) return;
    event.target.value = INVOICE_FILE.emptyInput;
    parseRequest.current += PLAN_LIMITS.nextOccurrence;
    const request = parseRequest.current;
    setState({ ...EMPTY, owner: threadId, fileName: file.name, parsing: true });
    try {
      const parsed = await parseAttachment(file, agentMode);
      if (request === parseRequest.current) setState((current) => ({ ...current, ...parsed }));
    } catch (error) {
      if (request === parseRequest.current) setState((current) => ({ ...current, error: error instanceof Error ? error.message : PLAN_COPY.parseFailed }));
    } finally {
      if (request === parseRequest.current) setState((current) => ({ ...current, parsing: false }));
    }
  }
  function removeAttachment() { parseRequest.current += PLAN_LIMITS.nextOccurrence; setState(EMPTY); }
  return { ...(state.owner === threadId ? state : EMPTY), attachFile, removeAttachment, claimThread: (id: string) => { setState((current) => ({ ...current, owner: id })); } };
}
