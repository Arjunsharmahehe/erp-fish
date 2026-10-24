import * as z from "zod";

export const CHAT_ACTIVITY = {
  planning: "planning", search: "web_search", fetch: "fetch_url", answer: "answer",
  running: "running", complete: "complete", error: "error",
} as const;
export const CHAT_STREAM = { activity: "chat.activity", answer: "chat.answer", custom: "CUSTOM", error: "RUN_ERROR" } as const;
export const ChatActivitySchema = z.object({
  id: z.string(),
  kind: z.enum([CHAT_ACTIVITY.planning, CHAT_ACTIVITY.search, CHAT_ACTIVITY.fetch, CHAT_ACTIVITY.answer]),
  status: z.enum([CHAT_ACTIVITY.running, CHAT_ACTIVITY.complete, CHAT_ACTIVITY.error]),
  detail: z.string().optional(),
});
export type ChatActivity = z.infer<typeof ChatActivitySchema>;
export const ChatActivitiesSchema = z.array(ChatActivitySchema);
export const PlanningToolArgsSchema = z.object({ query: z.string().optional(), url: z.string().optional() });
export const StoredChatDetailsSchema = z.object({ details: z.string().nullable() });
