import * as z from "zod";
import {
  InvoiceJSONSchema,
  JobStatusSchema,
  QuestionStatusSchema,
  TaskKindSchema,
  TaskStatusSchema,
} from "shared";

export const JobRowSchema = z.object({
  id: z.string(),
  erp_host: z.string(),
  profile_id: z.string(),
  invoice_json: z.string(),
  instruction: z.string(),
  status: JobStatusSchema,
  result_ids: z.string().nullable(),
  created_at: z.string(),
});

export type JobRow = z.infer<typeof JobRowSchema>;

export const TaskRowSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  kind: TaskKindSchema,
  status: TaskStatusSchema,
  agent_run_id: z.string().nullable(),
  output_id: z.string().nullable(),
});

export type TaskRow = z.infer<typeof TaskRowSchema>;

export const QuestionRowSchema = z.object({
  id: z.string(),
  job_id: z.string(),
  q_norm: z.string(),
  q_raw: z.string(),
  answer: z.string().nullable(),
  status: QuestionStatusSchema,
});

export type QuestionRow = z.infer<typeof QuestionRowSchema>;

export const CompletedOutputRowSchema = z.object({
  output_id: z.string().nullable(),
  invoice_json: z.string(),
});

export const MemoryAnswerRowSchema = z.object({ answer: z.string() });

export const UserRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  password_hash: z.string(),
  erp_host: z.string().nullable(),
  profile_id: z.string().nullable(),
  created_at: z.string(),
});

export type UserRow = z.infer<typeof UserRowSchema>;

export const ChatThreadRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  created_at: z.string(),
});

export type ChatThreadRow = z.infer<typeof ChatThreadRowSchema>;

export const ChatMessageRowSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  role: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export type ChatMessageRow = z.infer<typeof ChatMessageRowSchema>;

export type ParsedInvoice = z.infer<typeof InvoiceJSONSchema>;
