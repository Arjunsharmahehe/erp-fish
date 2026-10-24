"use client";
import { useCopy } from "@/hooks/use-copy";
import { useState } from "react";
import Image from "next/image";
import { CheckIcon, CircleAlertIcon, ListChecksIcon } from "lucide-react";
import { CHAT_ACTIVITY, type ChatActivity } from "shared";
import { Spinner } from "@/components/ui/spinner";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { brand } from "@/lib/brand";
import { CHAT_COPY, CHAT_PRESENTATION } from "@/lib/chat-presentation";

function ActivityStep({ step }: { step: ChatActivity }) {
  const t = useCopy();
  const running = step.status === CHAT_ACTIVITY.running;
  const error = step.status === CHAT_ACTIVITY.error;
  const browsing = step.kind === CHAT_ACTIVITY.search || step.kind === CHAT_ACTIVITY.fetch;
  return <TraceCollapsible>
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? CHAT_ACTIVITY.running : error ? CHAT_ACTIVITY.error : undefined}>
          <TraceIcon>{running ? <Spinner /> : error ? <CircleAlertIcon /> : <CheckIcon />}</TraceIcon>
          <TraceTitle>{t(CHAT_COPY[step.kind][step.status])}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      {browsing && <span className="partner-logo-surface"><Image src={brand.tinyfish} alt={brand.tinyfishAlt} width={brand.tinyfishWidth} height={brand.tinyfishHeight} className="h-5 w-auto" /></span>}
    </div>
    <TraceCollapsibleContent><p className="text-sm wrap-anywhere">{step.detail ?? t(CHAT_COPY[step.kind][step.status])}</p></TraceCollapsibleContent>
  </TraceCollapsible>;
}

function ActivityStatus({ activity, working }: { activity: ChatActivity[]; working: boolean }) {
  const t = useCopy();
  const latest = activity.at(-CHAT_PRESENTATION.step);
  if (working) return <span className="sr-only" role="status">{latest ? t(CHAT_COPY[latest.kind][latest.status]) : t(CHAT_COPY.starting)}</span>;
  const failed = activity.some((step) => step.status === CHAT_ACTIVITY.error);
  return <span className="sr-only" role="status">{failed ? t(CHAT_COPY.failed) : t(CHAT_COPY.complete)}</span>;
}

export function ChatActivityTrace({ activity, working = false }: { activity: ChatActivity[]; working?: boolean }) {
  const t = useCopy();
  const [open, setOpen] = useState<boolean>();
  if (!working && activity.length === CHAT_PRESENTATION.first) return null;
  return <Trace className="my-3">
    <TraceCollapsible open={open ?? working} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine status={working ? CHAT_ACTIVITY.running : undefined}>
          <TraceIcon>{working ? <Spinner /> : <ListChecksIcon />}</TraceIcon>
          <TraceTitle>{working ? t(CHAT_COPY.working) : t(CHAT_COPY.activity)}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <Trace>{activity.map((step) => <ActivityStep key={step.id} step={step} />)}</Trace>
        {working && activity.length === CHAT_PRESENTATION.first && <p className="text-sm">{t(CHAT_COPY.starting)}</p>}
      </TraceCollapsibleContent>
    </TraceCollapsible>
    <ActivityStatus activity={activity} working={working} />
  </Trace>;
}
