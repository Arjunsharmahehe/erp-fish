"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentRunView } from "shared";
import { Questionnaire, QuestionnaireActions, QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireSubmit, QuestionnaireTitle } from "@/components/ui/questionnaire";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMessageDraft } from "@/hooks/use-message-draft";
import { useEnglishInput } from "./language-provider";
import { TranslatedText } from "./translated-text";
import { VoiceInput } from "./voice-input";
import { WorkspaceError } from "./workspace-feedback";
import { answerAgent } from "@/lib/agent-api";
import { agentUi as COPY } from "@/lib/agent-ui";
import { PLAN_API } from "@/lib/plan-config";
import { useCopy } from "@/hooks/use-copy";
const QUESTION = Object.freeze({ name: "agent-answer", items: [{ name: "agent-answer", required: true }] });

export function AgentQuestion({ run }: { run: AgentRunView }) {
  const t = useCopy(); const client = useQueryClient(); const translate = useEnglishInput();
  const draft = useMessageDraft();
  const mutation = useMutation({ mutationFn: async () => {
    const translated = await translate(draft.draft.trim(), { source: draft.draftLanguage, parts: draft.draftParts, interactive: true });
    return answerAgent(run.id, { answer: translated.content, original: translated.original });
  }, onSuccess: async (value) => {
    client.setQueryData<AgentRunView[]>([COPY.query, run.thread_id], (rows) => rows?.map((row) => row.id === value.id ? value : row));
    await client.invalidateQueries({ queryKey: [PLAN_API.threads, run.thread_id] });
  } });
  return <Card><CardHeader><CardTitle>{t(COPY.waiting)}</CardTitle></CardHeader><CardContent>
    <Questionnaire items={QUESTION.items} onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending && draft.draft.trim()) mutation.mutate(); }}>
      <QuestionnaireItem name={QUESTION.name} required><QuestionnaireTitle><TranslatedText text={run.question ?? COPY.reply} /></QuestionnaireTitle>
        <QuestionnaireInput aria-label={t(COPY.reply)} value={draft.draft} onChange={(event) => { draft.setDraft(event.target.value); }} disabled={mutation.isPending} />
        <VoiceInput disabled={mutation.isPending} onTranscript={draft.setVoiceDraft} /><QuestionnaireError />
      </QuestionnaireItem><WorkspaceError error={mutation.error} /><QuestionnaireActions><QuestionnaireSubmit disabled={mutation.isPending || !draft.draft.trim()}>{t(mutation.isPending ? COPY.continuing : COPY.continue)}</QuestionnaireSubmit></QuestionnaireActions>
    </Questionnaire>
  </CardContent></Card>;
}
