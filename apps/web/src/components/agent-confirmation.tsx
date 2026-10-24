"use client";
import { useState } from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { AGENT, type AgentRunRequest } from "shared";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceError } from "./workspace-feedback";
import { agentUi as COPY } from "@/lib/agent-ui";
import { useCopy } from "@/hooks/use-copy";
import type { useAgentComposer } from "@/hooks/use-agent-chat";

function CompletionChoices({ mode, busy, onChange }: { mode: AgentRunRequest["completion_mode"]; busy: boolean; onChange: (mode: AgentRunRequest["completion_mode"]) => void }) {
  const t = useCopy();
  return <ToggleGroup value={[mode]} disabled={busy} variant="choice" size="choice" orientation="vertical" className="w-full" aria-label={t(COPY.confirmTitle)} onValueChange={(values) => { const next = values.at(COPY.first); if (next === AGENT.modes.draft || next === AGENT.modes.submit) onChange(next); }}>
    <ToggleGroupItem value={AGENT.modes.draft}>
      {mode === AGENT.modes.draft ? <CheckCircle2Icon aria-hidden="true" /> : <CircleIcon aria-hidden="true" />}
      <span className="flex flex-col gap-1"><span>{t(COPY.draft)}</span><span className="text-xs font-normal leading-relaxed">{t(COPY.draftHint)}</span></span>
    </ToggleGroupItem>
    <ToggleGroupItem value={AGENT.modes.submit}>
      {mode === AGENT.modes.submit ? <CheckCircle2Icon aria-hidden="true" /> : <CircleIcon aria-hidden="true" />}
      <span className="flex flex-col gap-1"><span>{t(COPY.submit)}</span><span className="text-xs font-normal leading-relaxed">{t(COPY.submitHint)}</span></span>
    </ToggleGroupItem>
  </ToggleGroup>;
}

export function AgentConfirmation({ state, draft }: { state: ReturnType<typeof useAgentComposer>; draft: string }) {
  const t = useCopy();
  const [mode, setMode] = useState<AgentRunRequest["completion_mode"]>(AGENT.modes.draft);
  const busy = state.mutation.isPending;
  return <Dialog open={state.confirm} onOpenChange={(open) => { if (!busy) state.setConfirm(open); }}><DialogContent showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{t(COPY.confirmTitle)}</DialogTitle><DialogDescription>{t(COPY.confirmDescription)}</DialogDescription></DialogHeader>
    <div className="flex flex-col gap-2"><p className="text-xs text-muted-foreground">{t(COPY.target)}</p><p className="break-all text-sm font-medium">{state.availability.data?.erp_host}</p><p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{draft}</p></div>
    <CompletionChoices mode={mode} busy={busy} onChange={setMode} />
    <WorkspaceError error={state.mutation.error ?? state.availability.error} />
    {state.availability.data?.message && <p role="status" className="text-sm text-muted-foreground">{t(state.availability.data.message)}</p>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={() => { state.setConfirm(false); }}>{t(COPY.cancel)}</Button><Button disabled={busy || !state.availability.data?.ready} onClick={() => { state.mutation.mutate(mode); }}>{busy && <Spinner data-icon="inline-start" />}{t(mode === AGENT.modes.draft ? COPY.startDraft : COPY.startSubmit)}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
