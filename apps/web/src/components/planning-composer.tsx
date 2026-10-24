"use client";

import { useRef, type RefObject } from "react";
import { ArrowUpIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { HOME_COPY, HOME_KEYS } from "@/lib/home-config";
import { PLAN_COPY, PLAN_MODE, PLAN_LIMITS } from "@/lib/plan-config";

type ChatState = ReturnType<typeof useChatSend>;
type InvoiceState = ReturnType<typeof useInvoice>;
type Mode = typeof PLAN_MODE.planning | typeof PLAN_MODE.agent;
interface ModeControl { mode: Mode; setMode: (mode: Mode) => void }
const MODE_ITEMS = [{ value: PLAN_MODE.planning, label: PLAN_COPY.planning }, { value: PLAN_MODE.agent, label: PLAN_COPY.agent }];

function InvoiceAttachment({ state }: { state: InvoiceState }) {
  if (!state.fileName) return null;
  return <Attachment state={state.parsing ? "processing" : state.invoice ? "done" : "error"}>
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{state.fileName}</AttachmentTitle>
      <AttachmentDescription>{state.invoice ? `${PLAN_COPY.invoiceReady}: ${state.invoice.invoice_no}` : state.parsing ? PLAN_COPY.loading : PLAN_COPY.parseFailed}</AttachmentDescription>
    </AttachmentContent>
  </Attachment>;
}

function ComposerActions({ chat, invoice, disabled, mode, setMode }: { chat: ChatState; invoice: InvoiceState; disabled: boolean } & ModeControl) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <InputGroupAddon align="block-end" className="justify-between">
    <div className="flex items-center gap-2">
      <input ref={fileInput} type="file" hidden aria-label={HOME_COPY.attachHint} disabled={disabled} onChange={(event) => { void invoice.attachFile(event); }} />
      <InputGroupButton size="icon-sm" aria-label={HOME_COPY.attach} title={HOME_COPY.attachHint} disabled={disabled} onClick={() => { fileInput.current?.click(); }}>
        <PlusIcon />
      </InputGroupButton>
      <Select items={MODE_ITEMS} value={mode} disabled={chat.sending || invoice.parsing} onValueChange={(value) => { if (value === PLAN_MODE.planning || value === PLAN_MODE.agent) setMode(value); }}>
        <SelectTrigger size="sm" aria-label={HOME_COPY.modeLabel}><SelectValue /></SelectTrigger>
        <SelectContent side="top" align="start"><SelectGroup>
          {MODE_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectGroup></SelectContent>
      </Select>
    </div>
    <InputGroupButton type="submit" variant="default" size="icon-sm" aria-label={chat.sending ? PLAN_COPY.sending : PLAN_COPY.send} disabled={!chat.draft.trim() || disabled}>
      {chat.sending ? <Spinner /> : <ArrowUpIcon />}
    </InputGroupButton>
  </InputGroupAddon>;
}

export function PlanningComposer({ chat, invoice, disabled, inputRef, mode, setMode }: {
  chat: ChatState; invoice: InvoiceState; disabled: boolean; inputRef: RefObject<HTMLTextAreaElement | null>;
} & ModeControl) {
  const error = chat.error ?? invoice.error;
  return <form onSubmit={(event) => { void chat.send(event); }} className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-5 pb-5 sm:px-8 sm:pb-7">
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <InvoiceAttachment state={invoice} />
    <InputGroup>
      <InputGroupTextarea ref={inputRef} rows={PLAN_LIMITS.composerRows} aria-label={PLAN_COPY.composeLabel} placeholder={HOME_COPY.composerPlaceholder} className="min-h-10 max-h-32 overflow-y-auto" value={chat.draft} onChange={(event) => { chat.setDraft(event.target.value); }} disabled={disabled} onKeyDown={(event) => {
        if (event.key !== HOME_KEYS.submit || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }} />
      <ComposerActions chat={chat} invoice={invoice} disabled={disabled} mode={mode} setMode={setMode} />
    </InputGroup>
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-xs leading-relaxed text-muted-foreground">
      <p>{HOME_COPY.composerHint}</p>
      <p className="hidden sm:block">{HOME_COPY.shortcutHint}</p>
    </div>
  </form>;
}
