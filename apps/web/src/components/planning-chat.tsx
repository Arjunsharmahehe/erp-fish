"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileTextIcon, PaperclipIcon, SendIcon, MessageSquareIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { type ChatMessage } from "@/lib/plan-api";
import { PLAN_COPY, PLAN_HTTP, PLAN_LIMITS, PLAN_MODE, PLAN_ROUTES } from "@/lib/plan-config";

type Mode = typeof PLAN_MODE.planning | typeof PLAN_MODE.agent;
type ChatState = ReturnType<typeof useChatSend>;
type InvoiceState = ReturnType<typeof useInvoice>;

function ChatHeader({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
    <div><h1 className="text-xl font-semibold tracking-tight">{PLAN_COPY.chatTitle}</h1><p className="text-sm text-muted-foreground">{PLAN_COPY.chatDescription}</p></div>
    <ToggleGroup value={[mode]} onValueChange={(values) => {
      const selected = values.at(PLAN_LIMITS.firstStep);
      if (selected === PLAN_MODE.planning || selected === PLAN_MODE.agent) setMode(selected);
    }} variant="outline" aria-label="Conversation mode">
      <ToggleGroupItem value={PLAN_MODE.planning}>{PLAN_COPY.planning}</ToggleGroupItem>
      <ToggleGroupItem value={PLAN_MODE.agent}>{PLAN_COPY.agent}</ToggleGroupItem>
    </ToggleGroup>
  </div>;
}

function ChatHistory({ messages, loading, threadId }: { messages: ChatMessage[]; loading: boolean; threadId: string | null }) {
  const seen = new Map<string, number>();
  return <div className="min-h-0 flex-1">
    <MessageScrollerProvider autoScroll><MessageScroller><MessageScrollerViewport>
      <MessageScrollerContent className="mx-auto w-full max-w-3xl">
        {messages.length === 0 && !loading && <MessageScrollerItem>
          <Empty><EmptyHeader><EmptyMedia variant="icon"><MessageSquareIcon /></EmptyMedia><EmptyTitle>{PLAN_COPY.chatTitle}</EmptyTitle><EmptyDescription>{PLAN_COPY.chatDescription}</EmptyDescription></EmptyHeader></Empty>
        </MessageScrollerItem>}
        {messages.map((message) => {
          const signature = `${message.role}:${message.content}`;
          const occurrence = seen.get(signature) ?? PLAN_LIMITS.firstStep;
          seen.set(signature, occurrence + PLAN_LIMITS.nextOccurrence);
          const id = `${threadId ?? PLAN_ROUTES.home}:${signature}:${String(occurrence)}`;
          const align = message.role === "user" ? "end" : "start";
          return <MessageScrollerItem key={id} messageId={id} scrollAnchor={message.role === "user"}>
            <Message align={align}><MessageContent><Bubble variant={align === "end" ? "default" : "muted"} align={align}><BubbleContent>{message.content}</BubbleContent></Bubble></MessageContent></Message>
          </MessageScrollerItem>;
        })}
      </MessageScrollerContent>
    </MessageScrollerViewport><MessageScrollerButton /></MessageScroller></MessageScrollerProvider>
  </div>;
}

function InvoiceAttachment({ state }: { state: InvoiceState }) {
  if (!state.fileName) return null;
  return <Attachment state={state.parsing ? "processing" : state.invoice ? "done" : "error"}>
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{state.fileName}</AttachmentTitle>
      <AttachmentDescription>{state.invoice ? `${PLAN_COPY.invoiceReady}: ${state.invoice.invoice_no}` : state.parsing ? PLAN_COPY.loading : PLAN_COPY.parseFailed}</AttachmentDescription>
    </AttachmentContent>
  </Attachment>;
}

function composerDisabled(options: { chat: ChatState; invoice: InvoiceState; mode: Mode; threadId: string | null }) {
  return options.chat.sending || options.invoice.parsing || options.mode === PLAN_MODE.agent || (options.threadId !== null && options.chat.thread.isPending);
}

function ChatComposer({ chat, invoice, mode, threadId }: { chat: ChatState; invoice: InvoiceState; mode: Mode; threadId: string | null }) {
  const disabled = composerDisabled({ chat, invoice, mode, threadId });
  const error = chat.error ?? invoice.error ?? (chat.thread.isError ? PLAN_COPY.chatFailed : null);
  return <form onSubmit={(event) => { void chat.send(event); }} className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 pb-5">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <InvoiceAttachment state={invoice} />
    <InputGroup>
      <InputGroupTextarea aria-label={PLAN_COPY.composeLabel} placeholder={PLAN_COPY.composePlaceholder} value={chat.draft} onChange={(event) => { chat.setDraft(event.target.value); }} disabled={disabled} />
      <InputGroupAddon align="block-end" className="justify-between">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <PaperclipIcon aria-hidden="true" />{PLAN_COPY.attach}
          <input type="file" accept={PLAN_HTTP.pdf} className="sr-only" disabled={disabled} onChange={(event) => { void invoice.attachFile(event); }} />
        </label>
        <Button type="submit" disabled={!chat.draft.trim() || disabled}><SendIcon data-icon="inline-start" />{chat.sending ? PLAN_COPY.sending : PLAN_COPY.send}</Button>
      </InputGroupAddon>
    </InputGroup>
  </form>;
}

function Conversation({ threadId, invoice }: { threadId: string | null; invoice: InvoiceState }) {
  const [mode, setMode] = useState<Mode>(PLAN_MODE.planning);
  const chat = useChatSend({ threadId, invoice: invoice.invoice, claimInvoice: invoice.claimThread });
  return <main className="flex min-h-0 min-w-0 flex-1 flex-col">
    <ChatHeader mode={mode} setMode={setMode} />
    {mode === PLAN_MODE.agent && <Marker><MarkerContent>{PLAN_COPY.agentComing}</MarkerContent></Marker>}
    <ChatHistory messages={chat.messages} loading={chat.thread.isPending && threadId !== null} threadId={threadId} />
    <ChatComposer chat={chat} invoice={invoice} mode={mode} threadId={threadId} />
  </main>;
}

export function PlanningChat() {
  const threadId = useSearchParams().get("thread");
  const invoice = useInvoice(threadId);
  return <Conversation key={threadId ?? PLAN_ROUTES.home} threadId={threadId} invoice={invoice} />;
}
