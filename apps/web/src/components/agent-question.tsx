"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentRunView, OriginalMessage } from "shared";
import { Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireSubmit, QuestionnaireTitle } from "@/components/ui/questionnaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMessageDraft } from "@/hooks/use-message-draft";
import { useEnglishInput, useLanguage } from "./language-provider";
import { useTranslatedText } from "@/hooks/use-translated-text";
import { TranslatedText } from "./translated-text";
import { VoiceInput } from "./voice-input";
import { WorkspaceError } from "./workspace-feedback";
import { answerAgent } from "@/lib/agent-api";
import { agentUi as COPY } from "@/lib/agent-ui";
import { PLAN_API } from "@/lib/plan-config";
import { useCopy } from "@/hooks/use-copy";
const QUESTION = Object.freeze({ name: "agent-answer", empty: "" });
interface SelectedChoice { value: string; original: OriginalMessage }
function AgentChoice({ value, selected, busy, choose }: { value: string; selected: boolean; busy: boolean; choose: (choice: SelectedChoice) => void }) {
  const display = useTranslatedText(value);
  const { locale } = useLanguage();
  return <QuestionnaireChoice value={value} checked={selected} disabled={busy || display.pending} onChange={(event) => {
    if (event.target.checked) choose({ value, original: { text: display.text || value, language: display.error ? "en" : locale } });
  }}>{display.text || value}</QuestionnaireChoice>;
}

export function AgentQuestion({ run }: { run: AgentRunView }) {
  const t = useCopy(); const client = useQueryClient(); const translate = useEnglishInput();
  const draft = useMessageDraft();
  const [choice, setChoice] = useState<SelectedChoice | null>(null);
  const items = [{ name: QUESTION.name, required: true, choices: run.choices.map((value) => ({ value })) }];
  const canAnswer = choice !== null || Boolean(draft.draft.trim());
  const mutation = useMutation({ mutationFn: async () => {
    const translated = choice ? { content: choice.value, original: choice.original } : await translate(draft.draft.trim(), { source: draft.draftLanguage, parts: draft.draftParts, interactive: true });
    return answerAgent(run.id, { answer: translated.content, original: translated.original });
  }, onSuccess: async (value) => {
    client.setQueryData<AgentRunView[]>([COPY.query, run.thread_id], (rows) => rows?.map((row) => row.id === value.id ? value : row));
    await client.invalidateQueries({ queryKey: [PLAN_API.threads, run.thread_id] });
  } });
  return <Card><CardHeader><CardTitle>{t(COPY.waiting)}</CardTitle></CardHeader><CardContent>
    <Questionnaire items={items} shortcuts="numbers" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending && canAnswer) mutation.mutate(); }}>
      <QuestionnaireItem name={QUESTION.name} required><QuestionnaireTitle><TranslatedText text={run.question ?? COPY.reply} /></QuestionnaireTitle>
        <QuestionnaireDescription>{t(COPY.answerHint)}</QuestionnaireDescription>
        <QuestionnaireChoices>
          {run.choices.map((value) => <AgentChoice key={value} value={value} selected={choice?.value === value} busy={mutation.isPending} choose={(selected) => { setChoice(selected); draft.setDraft(QUESTION.empty); }} />)}
          <QuestionnaireInput aria-label={t(COPY.reply)} placeholder={t(COPY.customAnswer)} value={draft.draft} onChange={(event) => { setChoice(null); draft.setDraft(event.target.value); }} disabled={mutation.isPending} />
        </QuestionnaireChoices>
        <VoiceInput disabled={mutation.isPending} onTranscript={(value) => { setChoice(null); draft.setVoiceDraft(value); }} /><QuestionnaireError>{t(COPY.answerRequired)}</QuestionnaireError>
      </QuestionnaireItem><WorkspaceError error={mutation.error} /><QuestionnaireActions><QuestionnaireSubmit disabled={mutation.isPending || !canAnswer}>{t(mutation.isPending ? COPY.continuing : COPY.continue)}</QuestionnaireSubmit></QuestionnaireActions>
    </Questionnaire>
  </CardContent></Card>;
}
