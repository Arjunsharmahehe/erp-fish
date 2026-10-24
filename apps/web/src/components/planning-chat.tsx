"use client";
import { useCopy } from "@/hooks/use-copy";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Attachment, AttachmentContent, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { type ChatActivity } from "shared";
import { ChatActivityTrace } from "@/components/chat-activity-trace";
import { ResponseSources } from "@/components/assistant-response";
import { TranslatedResponse } from "@/components/translated-response";
import { BrandMark } from "@/components/brand-logo";
import { PlanningWelcome } from "@/components/planning-welcome";
import { PlanningComposer } from "@/components/planning-composer";
import { ChatQuestionnaire } from "@/components/chat-questionnaire";
import { useQuestionnaire } from "@/hooks/use-questionnaire";
import { useChatSend, useInvoice } from "@/hooks/use-planning-chat";
import { type ChatMessage } from "@/lib/plan-api";
import { HOME_COPY, HOME_QUERY } from "@/lib/home-config";
import { PLAN_COPY, PLAN_LIMITS, PLAN_MODE, PLAN_ROUTES } from "@/lib/plan-config";
import { cn } from "@/lib/utils";
import { useAgentComposer, useAgentRuns } from "@/hooks/use-agent-chat";
import { AgentConfirmation } from "./agent-confirmation";
import { AgentRunTrace } from "./agent-run-trace";
import { agentUi as AGENT_UI } from "@/lib/agent-ui";
import { WorkspaceError } from "./workspace-feedback";

type Mode = typeof PLAN_MODE.planning | typeof PLAN_MODE.agent;
type InvoiceState = ReturnType<typeof useInvoice>;

function ChatHeader({ mode }: { mode: Mode }) {
  const t = useCopy();
  return <div className="flex shrink-0 items-center px-5 py-5 sm:px-8">
    <div><h1 className="text-base font-medium">{t(mode === PLAN_MODE.agent ? AGENT_UI.title : HOME_COPY.planning)}</h1><p className="mt-1 text-xs text-muted-foreground">{t(mode === PLAN_MODE.agent ? AGENT_UI.description : HOME_COPY.planningDescription)}</p></div>
  </div>;
}

function SentAttachment({ attachment }: { attachment: ChatMessage["attachment"] }) {
  if (!attachment) return null;
  return <Attachment state="done">
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent><AttachmentTitle title={attachment.name} translate="no">{attachment.name}</AttachmentTitle></AttachmentContent>
  </Attachment>;
}
function ConversationMessage({ message }: { message: ChatMessage }) {
  const t = useCopy();
  const isUser = message.role === "user";
  const align = isUser ? "end" : "start";
  return <div className={cn("px-5 sm:px-8", !isUser && "pb-8")}><Message align={align}>
    <MessageContent>
      {isUser && <SentAttachment attachment={message.attachment} />}
      {!isUser && <MessageHeader><span className="flex items-center gap-2"><BrandMark className="h-5 w-6" />{t(HOME_COPY.assistant)}</span></MessageHeader>}
      {!isUser && <ChatActivityTrace activity={message.activity ?? []} />}
      <Bubble variant={isUser ? "secondary" : "ghost"} align={align}>
        <BubbleContent>{isUser ? <UserMessage message={message} /> : <TranslatedResponse content={message.content} />}</BubbleContent>
      </Bubble>
      {!isUser && <ResponseSources citations={message.citations} />}
    </MessageContent>
  </Message></div>;
}
function UserMessage({ message }: { message: ChatMessage }) {
  return <span className="whitespace-pre-wrap" lang={message.original?.language}>{message.original?.text ?? message.content}</span>;
}

interface HistoryProps {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  threadId: string | null;
  onPrompt: (prompt: string) => void;
  disabled: boolean;
  activity: ChatActivity[];
  questionnaire: ReturnType<typeof useQuestionnaire>;
  runs: ReturnType<typeof useAgentRuns>;
  agentMode: boolean;
}

function ChatHistory({ messages, loading, sending, threadId, onPrompt, disabled, activity, questionnaire, runs, agentMode }: HistoryProps) {
  const t = useCopy();
  const seen = new Map<string, number>();
  const empty = messages.length === PLAN_LIMITS.firstStep && !loading;
  return <div className="min-h-0 flex-1">
    <MessageScrollerProvider autoScroll><MessageScroller><MessageScrollerViewport>
      <MessageScrollerContent className={cn("mx-auto w-full max-w-3xl", empty && "justify-center")}>
        {empty && <MessageScrollerItem><PlanningWelcome onPrompt={onPrompt} disabled={disabled} agent={agentMode} /></MessageScrollerItem>}
        {loading && <MessageScrollerItem><div className="flex flex-col gap-4" role="status" aria-label={t(PLAN_COPY.loading)}><Skeleton className="h-5 w-24" /><Skeleton className="h-16 w-3/4" /><Skeleton className="ml-auto h-12 w-1/2" /></div></MessageScrollerItem>}
        {messages.map((message) => {
          const signature = `${message.role}:${message.content}`;
          const occurrence = seen.get(signature) ?? PLAN_LIMITS.firstStep;
          seen.set(signature, occurrence + PLAN_LIMITS.nextOccurrence);
          const id = `${threadId ?? PLAN_ROUTES.home}:${signature}:${String(occurrence)}`;
          return <MessageScrollerItem key={id} messageId={id} scrollAnchor={message.role === "user"}><ConversationMessage message={message} /></MessageScrollerItem>;
        })}
        <ChatProgress sending={sending} activity={activity} questionnaire={questionnaire} runs={runs} />
      </MessageScrollerContent>
    </MessageScrollerViewport><MessageScrollerButton /></MessageScroller></MessageScrollerProvider>
  </div>;
}
function ChatProgress({ sending, activity, questionnaire, runs }: Pick<HistoryProps, "sending" | "activity" | "questionnaire" | "runs">) {
  return <>
    {(sending || activity.length > PLAN_LIMITS.firstStep) && <MessageScrollerItem><div className="px-5 pb-8 sm:px-8"><ChatActivityTrace activity={activity} working={sending} /></div></MessageScrollerItem>}
    {(questionnaire.question ?? questionnaire.query.error) && <MessageScrollerItem><div className="px-5 pb-8 sm:px-8"><ChatQuestionnaire state={questionnaire} /></div></MessageScrollerItem>}
    {runs.query.data?.map((run) => <MessageScrollerItem key={run.id}><div className="px-5 pb-8 sm:px-8"><AgentRunTrace run={run} /></div></MessageScrollerItem>)}
    {runs.query.error && <MessageScrollerItem><div className="px-5 pb-8 sm:px-8"><WorkspaceError error={runs.query.error} retry={() => { void runs.query.refetch(); }} /></div></MessageScrollerItem>}
  </>;
}
function ConversationNotice({ chat }: { chat: ReturnType<typeof useChatSend> }) {
  const t = useCopy();
  return <>
    {chat.thread.isError && <div className="mx-auto w-full max-w-3xl px-5 sm:px-8"><Alert variant="destructive"><AlertDescription>{t(HOME_COPY.historyError)}<Button variant="outline" size="sm" onClick={() => { void chat.thread.refetch(); }}>{t(HOME_COPY.retry)}</Button></AlertDescription></Alert></div>}
  </>;
}
function historyIsUnavailable(chat: ReturnType<typeof useChatSend>, threadId: string | null) {
  return threadId !== null && !chat.thread.data && (chat.thread.isPending || chat.thread.isError);
}

function Conversation({ threadId, invoice }: { threadId: string | null; invoice: InvoiceState }) {
  const [selectedMode, setMode] = useState<Mode | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChatSend({ threadId, invoice });
  const runs = useAgentRuns(threadId);
  const mode = selectedMode ?? (runs.query.data?.length ? PLAN_MODE.agent : PLAN_MODE.planning);
  const agent = useAgentComposer({ threadId, chat, invoice });
  const questionnaire = useQuestionnaire(threadId);
  const historyUnavailable = historyIsUnavailable(chat, threadId);
  const disabled = [chat.sending, agent.mutation.isPending, invoice.parsing, historyUnavailable, questionnaire.blocked, runs.blocked, runs.query.isError].some(Boolean);
  const composerChat = mode === PLAN_MODE.agent ? { ...chat, sending: agent.mutation.isPending, error: null } : chat;
  function choosePrompt(prompt: string) {
    chat.replaceDraft(prompt);
    inputRef.current?.focus();
  }
  return <main className="flex min-h-0 min-w-0 flex-1 flex-col">
    <ChatHeader mode={mode} />
    <ConversationNotice chat={chat} />
    <ChatHistory messages={chat.messages} loading={chat.thread.isPending && threadId !== null} sending={chat.sending} activity={chat.activity} threadId={threadId} onPrompt={choosePrompt} disabled={disabled} questionnaire={questionnaire} runs={runs} agentMode={mode === PLAN_MODE.agent} />
    <PlanningComposer chat={composerChat} invoice={invoice} disabled={disabled} inputRef={inputRef} mode={mode} setMode={(next) => { if (next !== mode) invoice.removeAttachment(); setMode(next); }} onSubmit={mode === PLAN_MODE.agent ? agent.submit : undefined} />
    {agent.confirm && <AgentConfirmation state={agent} draft={chat.draft} />}
  </main>;
}

export function PlanningChat() {
  const params = useSearchParams();
  const threadId = params.get(HOME_QUERY.thread);
  const conversationKey = threadId ?? params.get(HOME_QUERY.draft) ?? PLAN_ROUTES.home;
  const invoice = useInvoice(conversationKey);
  return <Conversation key={conversationKey} threadId={threadId} invoice={invoice} />;
}
