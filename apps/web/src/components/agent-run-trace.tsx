"use client";
import Image from "next/image";
import { CheckIcon, CircleAlertIcon, MessageCircleQuestionIcon } from "lucide-react";
import { AGENT, BROWSER, type AgentRunView } from "shared";
import { BrowserViewer } from "./browser-viewer";
import { browserUi } from "@/lib/browser-ui";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AgentQuestion } from "./agent-question";
import { AgentRunRecovery } from "./agent-run-recovery";
import { TranslatedText } from "./translated-text";
import { agentUi as COPY } from "@/lib/agent-ui";
import { brand } from "@/lib/brand";
import { useCopy } from "@/hooks/use-copy";

const LABELS = Object.freeze({ preparing: COPY.starting, running: COPY.working, waiting: COPY.waiting, done: COPY.complete, failed: COPY.failed, uncertain: COPY.uncertain });
function RunIcon({ status }: { status: AgentRunView["status"] }) {
  if (status === AGENT.statuses.preparing || status === AGENT.statuses.running) return <Spinner />;
  if (status === AGENT.statuses.failed || status === AGENT.statuses.uncertain) return <CircleAlertIcon />;
  return status === AGENT.statuses.waiting ? <MessageCircleQuestionIcon /> : <CheckIcon />;
}
function RunDetails({ run }: { run: AgentRunView }) {
  const t = useCopy();
  return <div className="flex flex-col gap-3 text-sm"><p className="break-all">{run.erp_host}</p><TranslatedText text={run.instruction} />{run.provider_run_id && <p className="break-all text-xs">{t(COPY.runId)}: {run.provider_run_id}</p>}
    {run.records.map((record) => <p key={`${record.type}:${record.id}`}><span className="font-medium">{record.type} · {record.id}</span><span> · {t(record.state)}</span></p>)}
  </div>;
}
function RunFeedback({ run }: { run: AgentRunView }) {
  const t = useCopy();
  return <>
    {run.error && <Alert variant="destructive"><AlertDescription>{t(run.error)}</AlertDescription></Alert>}
    {run.status === AGENT.statuses.uncertain && <AgentRunRecovery run={run} />}
    {run.status === AGENT.statuses.waiting && <AgentQuestion key={`${run.id}:${run.question ?? COPY.empty}`} run={run} />}
  </>;
}
export function AgentRunTrace({ run }: { run: AgentRunView }) {
  const t = useCopy();
  const working = run.status === AGENT.statuses.preparing || run.status === AGENT.statuses.running;
  const error = run.status === AGENT.statuses.failed || run.status === AGENT.statuses.uncertain;
  return <div className="flex flex-col gap-4"><Trace><TraceCollapsible defaultOpen={working || error}>
    <div className="flex flex-wrap items-center gap-3"><TraceCollapsibleTrigger><TraceLine status={working ? "running" : error ? "error" : undefined}>
      <TraceIcon><RunIcon status={run.status} /></TraceIcon><TraceTitle>{t(LABELS[run.status])}</TraceTitle>
    </TraceLine></TraceCollapsibleTrigger>{run.provider === BROWSER.local ? <Badge variant="secondary">{t(browserUi.local)}</Badge> : <span className="partner-logo-surface"><Image src={brand.tinyfish} alt={brand.tinyfishAlt} width={brand.tinyfishWidth} height={brand.tinyfishHeight} className="h-5 w-auto" /></span>}<Badge variant="outline">{t(run.completion_mode === AGENT.modes.draft ? COPY.draft : COPY.submit)}</Badge>{run.provider === BROWSER.local && <BrowserViewer run={run} />}</div>
    <TraceCollapsibleContent><RunDetails run={run} /></TraceCollapsibleContent>
  </TraceCollapsible></Trace><span className="sr-only" role="status">{t(LABELS[run.status])}</span>
    <RunFeedback run={run} />
  </div>;
}
