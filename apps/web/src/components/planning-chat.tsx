"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BrandMark } from "@/components/brand-logo";
import { PlanningWelcome } from "@/components/planning-welcome";
import { PlanningComposer } from "@/components/planning-composer";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { type ChatMessage } from "@/lib/plan-api";
import { HOME_COPY, HOME_QUERY } from "@/lib/home-config";
import { PLAN_COPY, PLAN_LIMITS, PLAN_MODE, PLAN_ROUTES } from "@/lib/plan-config";
import { cn } from "@/lib/utils";

type Mode = typeof PLAN_MODE.planning | typeof PLAN_MODE.agent;
type InvoiceState = ReturnType<typeof useInvoice>;

function ChatHeader({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
    <div><h1 className="text-base font-medium">{HOME_COPY.planning}</h1><p className="mt-1 text-xs text-muted-foreground">{HOME_COPY.planningDescription}</p></div>
    <ToggleGroup value={[mode]} onValueChange={(values) => {
      const selected = values.at(PLAN_LIMITS.firstStep);
      if (selected === PLAN_MODE.planning || selected === PLAN_MODE.agent) setMode(selected);
    }} variant="outline" size="sm" aria-label={HOME_COPY.modeLabel}>
      <ToggleGroupItem value={PLAN_MODE.planning}>{PLAN_COPY.planning}</ToggleGroupItem>
      <ToggleGroupItem value={PLAN_MODE.agent}>{PLAN_COPY.agent}</ToggleGroupItem>
    </ToggleGroup>
  </div>;
}

function ConversationMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const align = isUser ? "end" : "start";
  return <div className="px-5 sm:px-8"><Message align={align}>
    <MessageContent>
      {!isUser && <MessageHeader><span className="flex items-center gap-2"><BrandMark className="h-5 w-6" />{HOME_COPY.assistant}</span></MessageHeader>}
      <Bubble variant={isUser ? "secondary" : "ghost"} align={align}>
        <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
      </Bubble>
    </MessageContent>
  </Message></div>;
}

interface HistoryProps {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  threadId: string | null;
  onPrompt: (prompt: string) => void;
  disabled: boolean;
}

function ChatHistory({ messages, loading, sending, threadId, onPrompt, disabled }: HistoryProps) {
  const seen = new Map<string, number>();
  const empty = messages.length === PLAN_LIMITS.firstStep && !loading;
  return <div className="min-h-0 flex-1">
    <MessageScrollerProvider autoScroll><MessageScroller><MessageScrollerViewport>
      <MessageScrollerContent className={cn("mx-auto w-full max-w-3xl", empty && "justify-center")}>
        {empty && <MessageScrollerItem><PlanningWelcome onPrompt={onPrompt} disabled={disabled} /></MessageScrollerItem>}
        {loading && <MessageScrollerItem><div className="flex flex-col gap-4" role="status" aria-label={PLAN_COPY.loading}><Skeleton className="h-5 w-24" /><Skeleton className="h-16 w-3/4" /><Skeleton className="ml-auto h-12 w-1/2" /></div></MessageScrollerItem>}
        {messages.map((message) => {
          const signature = `${message.role}:${message.content}`;
          const occurrence = seen.get(signature) ?? PLAN_LIMITS.firstStep;
          seen.set(signature, occurrence + PLAN_LIMITS.nextOccurrence);
          const id = `${threadId ?? PLAN_ROUTES.home}:${signature}:${String(occurrence)}`;
          return <MessageScrollerItem key={id} messageId={id} scrollAnchor={message.role === "user"}><ConversationMessage message={message} /></MessageScrollerItem>;
        })}
        {sending && <MessageScrollerItem><Marker role="status"><MarkerContent><Spinner />{HOME_COPY.sending}</MarkerContent></Marker></MessageScrollerItem>}
      </MessageScrollerContent>
    </MessageScrollerViewport><MessageScrollerButton /></MessageScroller></MessageScrollerProvider>
  </div>;
}

function Conversation({ threadId, invoice }: { threadId: string | null; invoice: InvoiceState }) {
  const [mode, setMode] = useState<Mode>(PLAN_MODE.planning);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChatSend({ threadId, invoice: invoice.invoice, claimInvoice: invoice.claimThread });
  const historyUnavailable = threadId !== null && !chat.thread.data && (chat.thread.isPending || chat.thread.isError);
  const disabled = chat.sending || invoice.parsing || mode === PLAN_MODE.agent || historyUnavailable;
  function choosePrompt(prompt: string) {
    chat.setDraft(prompt);
    inputRef.current?.focus();
  }
  return <main className="flex min-h-0 min-w-0 flex-1 flex-col">
    <ChatHeader mode={mode} setMode={setMode} />
    {mode === PLAN_MODE.agent && <Marker><MarkerContent>{PLAN_COPY.agentComing}</MarkerContent></Marker>}
    {chat.thread.isError && <div className="mx-auto w-full max-w-3xl px-5 sm:px-8"><Alert variant="destructive"><AlertDescription>{HOME_COPY.historyError}<Button variant="outline" size="sm" onClick={() => { void chat.thread.refetch(); }}>{HOME_COPY.retry}</Button></AlertDescription></Alert></div>}
    <ChatHistory messages={chat.messages} loading={chat.thread.isPending && threadId !== null} sending={chat.sending} threadId={threadId} onPrompt={choosePrompt} disabled={disabled} />
    <PlanningComposer chat={chat} invoice={invoice} disabled={disabled} inputRef={inputRef} />
  </main>;
}

export function PlanningChat() {
  const params = useSearchParams();
  const threadId = params.get(HOME_QUERY.thread);
  const conversationKey = threadId ?? params.get(HOME_QUERY.draft) ?? PLAN_ROUTES.home;
  const invoice = useInvoice(conversationKey);
  return <Conversation key={conversationKey} threadId={threadId} invoice={invoice} />;
}
