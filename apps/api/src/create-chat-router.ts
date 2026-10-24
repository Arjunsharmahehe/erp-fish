import type { Database } from "bun:sqlite";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { API_PATHS, ChatRequestSchema, ChatStreamRequestSchema, ChatThreadDetailSchema, ChatThreadSchema, ThreadUpdateSchema } from "shared";
import { readSessionUser } from "./auth";
import { ownedThread, resolveThreadId, storeNewUserTurns, runAssistantTurn } from "./chat-turn";
import { streamChatTurn } from "./stream-chat-turn";
import { listChatMessages, listChatThreads, updateChatThread, deleteChatThread } from "./threads";
import { HTTPException } from "hono/http-exception";
import { listLearningQuestions } from "./learning";
import { userMemoryScope } from "./learning-router";
import type { UserRow } from "./users";
import { assertChatIdle } from "./chat-lock";
import { requireThreadScope } from "./thread-scope";

const ROOT_PATH = "/";
const NO_CONTENT_STATUS = 204;
const WAITING_STATUS = 409;
const WAITING_MESSAGE = "Answer the pending questionnaire before sending another message.";
function checkQuestions(db: Database, { user, threadId }: { user: UserRow; threadId: string }) {
  assertChatIdle(threadId);
  requireThreadScope(db, { threadId, scope: userMemoryScope(user) });
  if (listLearningQuestions(db, { scope: userMemoryScope(user), sourceType: "chat", sourceId: threadId }).some((question) => question.status === "pending" || question.resume_status !== "done")) {
    throw new HTTPException(WAITING_STATUS, { message: WAITING_MESSAGE });
  }
}

function createThreadRouter(db: Database) {
  return new Hono()
    .get(API_PATHS.chatThreads, async (c) => {
      const user = await readSessionUser(c, db);
      return c.json(listChatThreads(db, user.id).map((row) => ChatThreadSchema.parse(row)));
    })
    .get(API_PATHS.chatThreadById, async (c) => {
      const user = await readSessionUser(c, db);
      const thread = ownedThread(db, { threadId: c.req.param("id"), userId: user.id });
      return c.json(ChatThreadDetailSchema.parse({ thread, messages: listChatMessages(db, thread.id) }));
    })
    .patch(API_PATHS.chatThreadById, zValidator("json", ThreadUpdateSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const thread = ownedThread(db, { threadId: c.req.param("id"), userId: user.id });
      const update = c.req.valid("json");
      updateChatThread(db, { thread, update });
      return c.json(ChatThreadSchema.parse({ ...thread, ...update }));
    })
    .delete(API_PATHS.chatThreadById, async (c) => {
      const user = await readSessionUser(c, db);
      const thread = ownedThread(db, { threadId: c.req.param("id"), userId: user.id });
      deleteChatThread(db, thread.id);
      return c.body(null, NO_CONTENT_STATUS);
    });
}

export function createChatRouter(db: Database) {
  return new Hono()
    .post(API_PATHS.chat, zValidator("json", ChatRequestSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const request = c.req.valid("json");
      const now = new Date().toISOString();
      const threadId = resolveThreadId(db, { userId: user.id, request, now });
      checkQuestions(db, { user: user, threadId: threadId });
      storeNewUserTurns(db, { threadId, messages: request.messages, now });
      return c.json(await runAssistantTurn({ db, threadId, request }));
    })
    .post(API_PATHS.chatStream, zValidator("json", ChatStreamRequestSchema), async (c) => {
      const user = await readSessionUser(c, db);
      const request = c.req.valid("json").forwardedProps;
      const now = new Date().toISOString();
      const threadId = resolveThreadId(db, { userId: user.id, request, now });
      checkQuestions(db, { user: user, threadId: threadId });
      storeNewUserTurns(db, { threadId, messages: request.messages, now });
      return streamChatTurn({ db, threadId, request });
    })
    .route(ROOT_PATH, createThreadRouter(db));
}
