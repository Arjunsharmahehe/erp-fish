"use client";
import { useState } from "react";
import Image from "next/image";
import { MonitorIcon, SquareIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENT, type AgentRunView } from "shared";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { WorkspaceError, WorkspaceLoading } from "./workspace-feedback";
import { fetchBrowserFrame, stopBrowser } from "@/lib/browser-api";
import { browserUi as COPY } from "@/lib/browser-ui";
import { agentUi } from "@/lib/agent-ui";
import { useCopy } from "@/hooks/use-copy";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 900;
const VIEWPORT = Object.freeze({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
function BrowserPreview({ frame, working }: { frame: string | null | undefined; working: boolean }) {
  const t = useCopy();
  if (frame) return <Image unoptimized src={frame} alt={t(COPY.imageAlt)} width={VIEWPORT.width} height={VIEWPORT.height} className="h-auto w-full rounded-lg border" />;
  return working ? <WorkspaceLoading /> : null;
}
function statusText(working: boolean, frame: string | null | undefined) { return working ? frame ? COPY.live : COPY.opening : COPY.ended; }
export function BrowserViewer({ run }: { run: AgentRunView }) {
  const t = useCopy(); const [open, setOpen] = useState(false); const client = useQueryClient();
  const working = run.status === AGENT.statuses.running;
  const frame = useQuery({ queryKey: [COPY.frameQuery, run.id], queryFn: ({ signal }) => fetchBrowserFrame(run.id, signal), enabled: open && working, refetchInterval: open && working ? COPY.interval : false, gcTime: COPY.noCache, retry: false });
  const stop = useMutation({ mutationFn: () => stopBrowser(run.id), onSuccess: async () => { await client.invalidateQueries({ queryKey: [agentUi.query, run.thread_id] }); await client.invalidateQueries({ queryKey: [COPY.frameQuery, run.id] }); } });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="outline" size="sm" disabled={!working && !open} />}><MonitorIcon data-icon="inline-start" />{t(COPY.watch)}</DialogTrigger>
    <DialogContent className="overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{t(COPY.viewerTitle)}</DialogTitle><DialogDescription>{t(COPY.viewerHint)}</DialogDescription></DialogHeader>
      <WorkspaceError error={frame.error ?? stop.error} />
      <BrowserPreview frame={frame.data} working={working} />
      <div className="flex items-center justify-between gap-4"><p role="status" className="text-sm text-muted-foreground">{t(statusText(working, frame.data))}</p><Button variant="destructive" disabled={!working || stop.isPending} onClick={() => { stop.mutate(); }}><SquareIcon data-icon="inline-start" />{t(stop.isPending ? COPY.stopping : COPY.stop)}</Button></div>
    </DialogContent>
  </Dialog>;
}
