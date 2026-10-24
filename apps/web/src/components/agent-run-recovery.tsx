"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentRunView } from "shared";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { WorkspaceError } from "./workspace-feedback";
import { useCopy } from "@/hooks/use-copy";
import { resolveAgent } from "@/lib/agent-api";
import { agentUi as COPY } from "@/lib/agent-ui";

export function AgentRunRecovery({ run }: { run: AgentRunView }) {
  const [open, setOpen] = useState(false);
  const t = useCopy(); const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => resolveAgent(run.id), onSuccess: (value) => {
    client.setQueryData<AgentRunView[]>([COPY.query, run.thread_id], (rows) => rows?.map((row) => row.id === value.id ? value : row)); setOpen(false);
  } });
  return <AlertDialog open={open} onOpenChange={(value) => { if (!mutation.isPending) setOpen(value); }}>
    <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>{t(COPY.resolve)}</AlertDialogTrigger>
    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t(COPY.resolveTitle)}</AlertDialogTitle><AlertDialogDescription>{t(COPY.resolveDescription)}</AlertDialogDescription></AlertDialogHeader>
      <WorkspaceError error={mutation.error} /><AlertDialogFooter><AlertDialogCancel disabled={mutation.isPending}>{t(COPY.cancel)}</AlertDialogCancel><AlertDialogAction disabled={mutation.isPending} onClick={(event) => { event.preventDefault(); mutation.mutate(); }}>{t(COPY.resolveConfirm)}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
