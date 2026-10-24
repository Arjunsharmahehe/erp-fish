"use client";

import { useRef, type RefObject } from "react";
import { ArrowUpIcon, FileTextIcon, PaperclipIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { HOME_COPY, HOME_KEYS } from "@/lib/home-config";
import { PLAN_COPY, PLAN_HTTP } from "@/lib/plan-config";

type ChatState = ReturnType<typeof useChatSend>;
type InvoiceState = ReturnType<typeof useInvoice>;

function InvoiceAttachment({ state }: { state: InvoiceState }) {
  if (!state.fileName) return null;
  return <Attachment state={state.parsing ? "processing" : state.invoice ? "done" : "error"}>
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{state.fileName}</AttachmentTitle>
      <AttachmentDescription>{state.invoice ? `${PLAN_COPY.invoiceReady}: ${state.invoice.invoice_no}` : state.parsing ? PLAN_COPY.loading : PLAN_COPY.parseFailed}</AttachmentDescription>
    </AttachmentContent>
  </Attachment>;
}

function ComposerActions({ chat, invoice, disabled }: { chat: ChatState; invoice: InvoiceState; disabled: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <InputGroupAddon align="block-end" className="justify-between">
    <input ref={fileInput} type="file" accept={PLAN_HTTP.pdf} hidden aria-label={HOME_COPY.attachHint} disabled={disabled} onChange={(event) => { void invoice.attachFile(event); }} />
    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => { fileInput.current?.click(); }}>
      <PaperclipIcon data-icon="inline-start" />{HOME_COPY.attach}
    </Button>
    <Button type="submit" size="icon" aria-label={chat.sending ? PLAN_COPY.sending : PLAN_COPY.send} disabled={!chat.draft.trim() || disabled}>
      {chat.sending ? <Spinner /> : <ArrowUpIcon />}
    </Button>
  </InputGroupAddon>;
}

export function PlanningComposer({ chat, invoice, disabled, inputRef }: {
  chat: ChatState; invoice: InvoiceState; disabled: boolean; inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const error = chat.error ?? invoice.error;
  return <form onSubmit={(event) => { void chat.send(event); }} className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-5 pb-5 sm:px-8 sm:pb-7">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <InvoiceAttachment state={invoice} />
    <InputGroup>
      <InputGroupTextarea ref={inputRef} aria-label={PLAN_COPY.composeLabel} placeholder={HOME_COPY.composerPlaceholder} className="min-h-24 max-h-40 overflow-y-auto sm:max-h-56" value={chat.draft} onChange={(event) => { chat.setDraft(event.target.value); }} disabled={disabled} onKeyDown={(event) => {
        if (event.key !== HOME_KEYS.submit || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }} />
      <ComposerActions chat={chat} invoice={invoice} disabled={disabled} />
    </InputGroup>
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-xs leading-relaxed text-muted-foreground">
      <p>{HOME_COPY.composerHint}</p>
      <p className="hidden sm:block">{HOME_COPY.shortcutHint}</p>
    </div>
  </form>;
}
