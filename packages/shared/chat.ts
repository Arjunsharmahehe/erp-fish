import * as z from "zod";
import { InvoiceJSONSchema, MIN_TEXT_LENGTH } from "./base";

export const MIN_CHAT_MESSAGES = 1 as const;

export const CHAT_ROLE_USER = "user" as const;
export const CHAT_ROLE_ASSISTANT = "assistant" as const;

export const ChatRoleSchema = z.enum([CHAT_ROLE_USER, CHAT_ROLE_ASSISTANT]);

export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().min(MIN_TEXT_LENGTH),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CHAT_MODE_PLANNING = "planning" as const;

export const ChatModeSchema = z.enum([CHAT_MODE_PLANNING]);

export type ChatMode = z.infer<typeof ChatModeSchema>;

export const ChatRequestSchema = z.object({
  thread_id: z.string().min(MIN_TEXT_LENGTH).optional(),
  messages: z.array(ChatMessageSchema).min(MIN_CHAT_MESSAGES),
  invoice: InvoiceJSONSchema.optional(),
  mode: ChatModeSchema,
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResultSchema = z.object({
  message: z.string().min(MIN_TEXT_LENGTH),
  citations: z.array(z.string()),
});

export type ChatResult = z.infer<typeof ChatResultSchema>;

export const ChatResponseSchema = ChatResultSchema.extend({
  thread_id: z.string().min(MIN_TEXT_LENGTH),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ChatThreadSchema = z.object({
  id: z.string().min(MIN_TEXT_LENGTH),
  title: z.string().min(MIN_TEXT_LENGTH),
  created_at: z.string().min(MIN_TEXT_LENGTH),
});

export type ChatThread = z.infer<typeof ChatThreadSchema>;

export const ChatThreadDetailSchema = z.object({
  thread: ChatThreadSchema,
  messages: z.array(ChatMessageSchema),
});

export type ChatThreadDetail = z.infer<typeof ChatThreadDetailSchema>;
