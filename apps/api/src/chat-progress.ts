import type { ChatMiddleware } from "@tanstack/ai";
import { CHAT_ACTIVITY, PlanningToolArgsSchema, type ChatActivity } from "shared";

export type ActivityListener = (activity: ChatActivity) => void;
const PROGRESS_NAME = "planning-progress";
const PLANNING_ID = "planning";
const ANSWER_ID = "answer";

export function createChatProgress(notify: ActivityListener): ChatMiddleware {
  const calls = new Map<string, ChatActivity>();
  function planning(status: ChatActivity["status"]) {
    notify({ id: PLANNING_ID, kind: CHAT_ACTIVITY.planning, status });
  }
  return {
    name: PROGRESS_NAME,
    onStart: () => { planning(CHAT_ACTIVITY.running); },
    onBeforeToolCall: (_context, call) => {
      if (call.toolName !== CHAT_ACTIVITY.search && call.toolName !== CHAT_ACTIVITY.fetch) return;
      planning(CHAT_ACTIVITY.complete);
      const args = PlanningToolArgsSchema.safeParse(call.args);
      const activity: ChatActivity = {
        id: call.toolCallId, kind: call.toolName, status: CHAT_ACTIVITY.running,
        detail: args.success ? args.data.query ?? args.data.url : undefined,
      };
      calls.set(call.toolCallId, activity);
      notify(activity);
    },
    onAfterToolCall: (_context, result) => {
      const activity = calls.get(result.toolCallId);
      if (activity) notify({ ...activity, status: result.ok ? CHAT_ACTIVITY.complete : CHAT_ACTIVITY.error });
    },
    onConfig: (context) => {
      if (context.phase !== "structuredOutput") return;
      planning(CHAT_ACTIVITY.complete);
      notify({ id: ANSWER_ID, kind: CHAT_ACTIVITY.answer, status: CHAT_ACTIVITY.running });
    },
  };
}
