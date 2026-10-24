"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { answerQuestion, fetchQuestions, retryQuestion } from "@/lib/workspace-api";
import { PLAN_API } from "@/lib/plan-config";
import { WORKSPACE_QUERY, WORKSPACE_LIMITS } from "@/lib/workspace-config";

export function useQuestionnaire(threadId: string | null) {
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
    mutationFn: (input: { id: string; answer?: string }) => input.answer === undefined ? retryQuestion(input.id) : answerQuestion(input.id, input.answer),
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
