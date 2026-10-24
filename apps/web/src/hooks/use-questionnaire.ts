"use client";
import type { Locale, OriginalMessage } from "shared";
import { useEnglishInput, useLanguage } from "@/components/language-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { answerQuestion, fetchQuestions, retryQuestion } from "@/lib/workspace-api";
import { PLAN_API } from "@/lib/plan-config";
import { WORKSPACE_QUERY, WORKSPACE_LIMITS } from "@/lib/workspace-config";

export function useQuestionnaire(threadId: string | null) {
  const englishInput = useEnglishInput();
  const { locale } = useLanguage();
  const client = useQueryClient();
  const queryKey = [WORKSPACE_QUERY.questions, threadId];
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const questions = await fetchQuestions(threadId ?? "");
      if (questions.some((question) => question.status === "answered")) {
        await client.invalidateQueries({ queryKey: [PLAN_API.threads, threadId] });
        await client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory });
      }
      return questions;
    },
    enabled: threadId !== null,
    refetchInterval: (state) => state.state.data?.some((item) => item.resume_status === "running") ? WORKSPACE_LIMITS.pollMs : false,
  });
  const mutation = useMutation({
    mutationFn: async (input: { id: string; answer?: string; choice?: string; language?: Locale; parts?: OriginalMessage[] }) => {
      if (input.answer === undefined) return retryQuestion(input.id);
      const translated = input.choice ? { content: input.choice, original: { text: input.answer, language: locale } } : await englishInput(input.answer, { source: input.language, parts: input.parts, interactive: true });
      return answerQuestion(input.id, { answer: translated.content, original: translated.original });
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey }),
        client.invalidateQueries({ queryKey: [PLAN_API.threads, threadId] }),
        client.invalidateQueries({ queryKey: WORKSPACE_QUERY.memory }),
      ]);
    },
  });
  const questions = query.data ?? [];
  const pending = questions.find((question) => question.status === "pending");
  const recoverable = questions.findLast((question) => question.status === "answered" && question.resume_status !== "done");
  return { query, mutation, question: pending ?? recoverable, blocked: Boolean(pending ?? recoverable) || mutation.isPending };
}
