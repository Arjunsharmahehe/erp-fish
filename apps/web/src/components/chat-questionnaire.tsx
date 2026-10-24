"use client";
import { useState } from "react";
import { type LearningQuestion } from "shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Questionnaire, QuestionnaireItem, QuestionnaireTitle, QuestionnaireDescription, QuestionnaireInput, QuestionnaireError, QuestionnaireActions, QuestionnaireSubmit } from "@/components/ui/questionnaire";
import { WorkspaceError } from "@/components/workspace-feedback";
import { WORKSPACE_COPY as COPY, WORKSPACE_FIELDS as FIELDS } from "@/lib/workspace-config";
import type { useQuestionnaire } from "@/hooks/use-questionnaire";

const ITEMS = [{ name: FIELDS.answerItem, required: true }];
function QuestionForm({ question, state }: { question: LearningQuestion; state: ReturnType<typeof useQuestionnaire> }) {
  const [answer, setAnswer] = useState("");
  const busy = state.mutation.isPending || question.resume_status === "running";
  return <Questionnaire items={ITEMS} onSubmit={(event) => { event.preventDefault(); if (answer.trim() && !busy) state.mutation.mutate({ id: question.id, answer: answer.trim() }); }}>
    <QuestionnaireItem name={FIELDS.answerItem} required>
      <QuestionnaireTitle>{question.question}</QuestionnaireTitle>
      <QuestionnaireDescription>{question.context}</QuestionnaireDescription>
      {question.choices.length > 0 && <div className="flex flex-wrap gap-2">{question.choices.map((choice) => <Button key={choice} type="button" variant={answer === choice ? "secondary" : "outline"} size="sm" disabled={busy} onClick={() => { setAnswer(choice); }}>{choice}</Button>)}</div>}
      <QuestionnaireInput aria-label={COPY.answerLabel} placeholder={COPY.answerPlaceholder} value={answer} disabled={busy} onChange={(event) => { setAnswer(event.target.value); }} />
      <QuestionnaireError />
    </QuestionnaireItem>
    <WorkspaceError error={state.mutation.error} />
    <QuestionnaireActions><QuestionnaireSubmit disabled={busy || !answer.trim()}>{busy ? COPY.answerSubmitting : COPY.answerSubmit}</QuestionnaireSubmit></QuestionnaireActions>
  </Questionnaire>;
}
export function ChatQuestionnaire({ state }: { state: ReturnType<typeof useQuestionnaire> }) {
  const question = state.question;
  if (!question) return <WorkspaceError error={state.query.error} retry={() => { void state.query.refetch(); }} />;
  return <Card><CardHeader><CardTitle>{COPY.answerPrompt}</CardTitle><CardDescription>{question.status === "pending" ? COPY.answerHint : COPY.answerSaved}</CardDescription></CardHeader><CardContent>
    {question.status === "pending" ? <QuestionForm key={question.id} question={question} state={state} /> : <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">{question.question}</p><p className="text-sm text-muted-foreground">{question.answer}</p>
      <p role="status" className="text-sm text-muted-foreground">{question.resume_status === "running" || state.mutation.isPending ? COPY.resumed : COPY.resumeFailed}</p>
      <WorkspaceError error={state.mutation.error} />
      {question.resume_status !== "running" && <Button disabled={state.mutation.isPending} onClick={() => { state.mutation.mutate({ id: question.id }); }}>{state.mutation.isPending ? COPY.answerSubmitting : COPY.resume}</Button>}
    </div>}
  </CardContent></Card>;
}
