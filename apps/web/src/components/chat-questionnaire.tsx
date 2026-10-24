"use client";
import { useCopy } from "@/hooks/use-copy";
import { useState } from "react";
import { useMessageDraft } from "@/hooks/use-message-draft";
import { TranslatedText } from "./translated-text";
import { VoiceInput } from "./voice-input";
import { useTranslatedText } from "@/hooks/use-translated-text";
import { type LearningQuestion } from "shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Questionnaire, QuestionnaireItem, QuestionnaireTitle, QuestionnaireDescription, QuestionnaireInput, QuestionnaireError, QuestionnaireActions, QuestionnaireSubmit } from "@/components/ui/questionnaire";
import { WorkspaceError } from "@/components/workspace-feedback";
import { WORKSPACE_COPY as COPY, WORKSPACE_FIELDS as FIELDS } from "@/lib/workspace-config";
import type { useQuestionnaire } from "@/hooks/use-questionnaire";

const ITEMS = [{ name: FIELDS.answerItem, required: true }];
function QuestionChoice({ choice, selected, busy, choose }: { choice: string; selected: boolean; busy: boolean; choose: (text: string) => void }) {
  const display = useTranslatedText(choice);
  return <Button type="button" variant={selected ? "secondary" : "outline"} size="sm" disabled={busy || display.pending || Boolean(display.error)} onClick={() => { choose(display.text); }}>{display.text || choice}</Button>;
}
function QuestionForm({ question, state }: { question: LearningQuestion; state: ReturnType<typeof useQuestionnaire> }) {
  const t = useCopy();
  const { draft: answer, setDraft: setAnswer, replaceDraft, draftLanguage, draftParts, setVoiceDraft } = useMessageDraft();
  const [choice, setChoice] = useState<string | undefined>(undefined);
  const busy = state.mutation.isPending || question.resume_status === "running";
  return <Questionnaire items={ITEMS} onSubmit={(event) => { event.preventDefault(); if (answer.trim() && !busy) state.mutation.mutate({ id: question.id, answer: answer.trim(), choice, language: draftLanguage, parts: draftParts }); }}>
    <QuestionnaireItem name={FIELDS.answerItem} required>
      <QuestionnaireTitle><TranslatedText text={question.question} /></QuestionnaireTitle>
      <QuestionnaireDescription><TranslatedText text={question.context} /></QuestionnaireDescription>
      {question.choices.length > 0 && <div className="flex flex-wrap gap-2">{question.choices.map((item) => <QuestionChoice key={item} choice={item} selected={choice === item} busy={busy} choose={(text) => { setChoice(item); replaceDraft(text); }} />)}</div>}
      <QuestionnaireInput aria-label={t(COPY.answerLabel)} placeholder={t(COPY.answerPlaceholder)} value={answer} disabled={busy} onChange={(event) => { setChoice(undefined); setAnswer(event.target.value); }} />
      <VoiceInput disabled={busy} onTranscript={(value) => { setChoice(undefined); setVoiceDraft(value); }} />
      <QuestionnaireError />
    </QuestionnaireItem>
    <WorkspaceError error={state.mutation.error} />
    <QuestionnaireActions><QuestionnaireSubmit disabled={busy || !answer.trim()}>{busy ? t(COPY.answerSubmitting) : t(COPY.answerSubmit)}</QuestionnaireSubmit></QuestionnaireActions>
  </Questionnaire>;
}
export function ChatQuestionnaire({ state }: { state: ReturnType<typeof useQuestionnaire> }) {
  const t = useCopy();
  const question = state.question;
  if (!question) return <WorkspaceError error={state.query.error} retry={() => { void state.query.refetch(); }} />;
  return <Card><CardHeader><CardTitle>{t(COPY.answerPrompt)}</CardTitle><CardDescription>{question.status === "pending" ? t(COPY.answerHint) : t(COPY.answerSaved)}</CardDescription></CardHeader><CardContent>
    {question.status === "pending" ? <QuestionForm key={question.id} question={question} state={state} /> : <div className="flex flex-col gap-4">
      <p className="text-sm font-medium"><TranslatedText text={question.question} /></p><p className="text-sm text-muted-foreground"><TranslatedText text={question.answer ?? ""} /></p>
      <p role="status" className="text-sm text-muted-foreground">{question.resume_status === "running" || state.mutation.isPending ? t(COPY.resumed) : t(COPY.resumeFailed)}</p>
      <WorkspaceError error={state.mutation.error} />
      {question.resume_status !== "running" && <Button disabled={state.mutation.isPending} onClick={() => { state.mutation.mutate({ id: question.id }); }}>{state.mutation.isPending ? t(COPY.answerSubmitting) : t(COPY.resume)}</Button>}
    </div>}
  </CardContent></Card>;
}
