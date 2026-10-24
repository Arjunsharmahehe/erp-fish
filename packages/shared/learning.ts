import { z } from "zod";
import { OriginalMessageSchema } from "./language";
const MAX_TEXT_LENGTH = 4000;
const MAX_QUESTION_LENGTH = 500;
const MAX_CHOICES = 8;

export const LEARNING = {
  min: 1, maxText: MAX_TEXT_LENGTH, maxQuestion: MAX_QUESTION_LENGTH, maxChoices: MAX_CHOICES,
  pending: "pending", answered: "answered", chat: "chat", job: "job",
  empty: "", legacyOwner: "legacy-unclaimed",
};
const text = z.string().trim().min(LEARNING.min).max(LEARNING.maxText);
export const MemoryScopeSchema = z.object({ userId: text, erpHost: text });
export type MemoryScope = z.infer<typeof MemoryScopeSchema>;
export const AskQuestionSchema = z.object({
  question: text.max(LEARNING.maxQuestion),
  context: text,
  choices: z.array(text).max(LEARNING.maxChoices).default([]),
});
export const LearningQuestionSchema = AskQuestionSchema.extend({
  id: text, user_id: text, erp_host: text,
  source_type: z.enum(["chat", "job"]), source_id: text,
  answer: text.nullable(),
  status: z.enum(["pending", "answered"]),
  resume_status: z.enum(["idle", "running", "done", "failed"]).default("idle"),
  created_at: text,
});
export type LearningQuestion = z.infer<typeof LearningQuestionSchema>;
export const SavedMemorySchema = z.object({
  id: text, user_id: text, erp_host: text,
  question: text, answer: text, context: text,
  source_question_id: text, source_type: z.enum(["chat", "job"]), source_id: text,
  original_question: text, original_answer: text,
  updated_at: text,
});
export type SavedMemory = z.infer<typeof SavedMemorySchema>;
export const MemoryEditSchema = z.object({ question: text, answer: text, context: text }).strict();
export const RememberAnswerSchema = z.object({ question_id: text, question: text, context: text }).strict();
export const MemorySearchSchema = z.object({ query: z.string().trim().max(LEARNING.maxText) });
export const QuestionAnswerSchema = z.object({ answer: text, original: OriginalMessageSchema.optional() }).strict();
export const LearningQuestionRowSchema = LearningQuestionSchema.omit({ choices: true }).extend({ choices: z.string() });
export const QuestionResumeRowSchema = z.object({ invoice_json: z.string().nullable(), resume_status: z.enum(["idle", "running", "done", "failed"]) });
export const MemoryDecisionSchema = z.object({ question: text, context: text }).nullable();
export const LEARNING_PATHS = Object.freeze({
  memories: "/api/learning/memories",
  memory: "/api/learning/memories/:id",
  questions: "/api/chat/threads/:id/questions",
  answer: "/api/chat/questions/:id/answer",
  retry: "/api/chat/questions/:id/retry",
});
