"use client";
import { useCopy } from "@/hooks/use-copy";
import { useRef, type RefObject, type SyntheticEvent } from "react";
import { VoiceInput } from "./voice-input";
import { ArrowUpIcon, FileTextIcon, PlusIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { HOME_COPY, HOME_KEYS } from "@/lib/home-config";
import { PLAN_COPY, PLAN_MODE, PLAN_LIMITS } from "@/lib/plan-config";
import { agentUi as AGENT_UI } from "@/lib/agent-ui";

type ChatState = ReturnType<typeof useChatSend>;
type InvoiceState = ReturnType<typeof useInvoice>;
type Mode = typeof PLAN_MODE.planning | typeof PLAN_MODE.agent;
interface ModeControl { mode: Mode; setMode: (mode: Mode) => void }
const MODE_ITEMS = [{ value: PLAN_MODE.planning, label: PLAN_COPY.planning }, { value: PLAN_MODE.agent, label: PLAN_COPY.agent }];

function InvoiceAttachment({ state, sending }: { state: InvoiceState; sending: boolean }) {
  const t = useCopy();
  if (!state.fileName) return null;
  return <Attachment state={state.parsing ? "processing" : state.invoice || state.document ? "done" : "error"}>
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle>{state.fileName}</AttachmentTitle>
      <AttachmentDescription>{state.document ? t(AGENT_UI.fileReady) : state.invoice ? `${t(PLAN_COPY.invoiceReady)}: ${state.invoice.invoice_no}` : state.parsing ? t(PLAN_COPY.loading) : t(PLAN_COPY.parseFailed)}</AttachmentDescription>
    </AttachmentContent>
    <AttachmentActions><AttachmentAction type="button" size="icon-sm" aria-label={`${t(PLAN_COPY.removeAttachment)}: ${state.fileName}`} title={t(PLAN_COPY.removeAttachment)} disabled={sending} onClick={state.removeAttachment}><XIcon /></AttachmentAction></AttachmentActions>
  </Attachment>;
}

function ComposerActions({ chat, invoice, disabled, mode, setMode, inputRef }: { chat: ChatState; invoice: InvoiceState; disabled: boolean; inputRef: RefObject<HTMLTextAreaElement | null> } & ModeControl) {
  const t = useCopy();
  const modes = MODE_ITEMS.map((item) => ({ ...item, label: t(item.label) }));
  const fileInput = useRef<HTMLInputElement>(null);
  return <InputGroupAddon align="block-end" className="justify-between">
    <div className="flex items-center gap-2">
      <input ref={fileInput} type="file" hidden accept={mode === PLAN_MODE.agent ? AGENT_UI.accept : undefined} aria-label={t(mode === PLAN_MODE.agent ? AGENT_UI.attachHint : HOME_COPY.attachHint)} disabled={disabled} onChange={(event) => { void invoice.attachFile(event, mode === PLAN_MODE.agent); }} />
      <InputGroupButton size="icon-sm" aria-label={t(mode === PLAN_MODE.agent ? AGENT_UI.attach : HOME_COPY.attach)} title={t(mode === PLAN_MODE.agent ? AGENT_UI.attachHint : HOME_COPY.attachHint)} disabled={disabled} onClick={() => { fileInput.current?.click(); }}>
        <PlusIcon />
      </InputGroupButton>
      <Select items={modes} value={mode} disabled={chat.sending || invoice.parsing} onValueChange={(value) => { if (value === PLAN_MODE.planning || value === PLAN_MODE.agent) setMode(value); }}>
        <SelectTrigger size="sm" aria-label={t(HOME_COPY.modeLabel)}><SelectValue /></SelectTrigger>
        <SelectContent side="top" align="start"><SelectGroup>
          {modes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectGroup></SelectContent>
      </Select>
    </div>
    <div className="flex items-center gap-2">
    <VoiceInput disabled={disabled} onTranscript={(value) => { chat.setVoiceDraft(value); inputRef.current?.focus(); }} />
    <InputGroupButton type="submit" variant="default" size="icon-sm" aria-label={chat.sending ? t(PLAN_COPY.sending) : t(PLAN_COPY.send)} disabled={!chat.draft.trim() || disabled}>
      {chat.sending ? <Spinner /> : <ArrowUpIcon />}
    </InputGroupButton>
    </div>
  </InputGroupAddon>;
}

export function PlanningComposer({ chat, invoice, disabled, inputRef, mode, setMode, onSubmit }: {
  chat: ChatState; invoice: InvoiceState; disabled: boolean; inputRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void;
} & ModeControl) {
  const t = useCopy();
  const error = chat.error ?? invoice.error;
  return <form onSubmit={(event) => { if (onSubmit) onSubmit(event); else void chat.send(event); }} className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 px-5 pb-5 sm:px-8 sm:pb-7">
    {error && <Alert variant="destructive"><AlertDescription>{t(error)}</AlertDescription></Alert>}
    <InvoiceAttachment state={invoice} sending={chat.sending} />
    <InputGroup>
      <InputGroupTextarea ref={inputRef} rows={PLAN_LIMITS.composerRows} aria-label={t(PLAN_COPY.composeLabel)} placeholder={t(HOME_COPY.composerPlaceholder)} className="min-h-10 max-h-32 overflow-y-auto" value={chat.draft} onChange={(event) => { chat.setDraft(event.target.value); }} disabled={disabled} onKeyDown={(event) => {
        if (event.key !== HOME_KEYS.submit || !(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }} />
      <ComposerActions chat={chat} invoice={invoice} disabled={disabled} mode={mode} setMode={setMode} inputRef={inputRef} />
    </InputGroup>
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-xs leading-relaxed text-muted-foreground">
      <p>{t(mode === PLAN_MODE.agent ? AGENT_UI.hint : HOME_COPY.composerHint)}</p>
      <p className="hidden sm:block">{t(HOME_COPY.shortcutHint)}</p>
    </div>
  </form>;
}
