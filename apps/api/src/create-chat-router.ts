import type { Database } from "bun:sqlite";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import {
  API_PATHS,
  CHAT_ROLE_ASSISTANT,
  CHAT_ROLE_USER,
  ChatRequestSchema,
  ChatResponseSchema,
  ChatThreadDetailSchema,
  ChatThreadSchema,
  type ChatMessage,
  type ChatRequest,
} from "shared";
import { readSessionUser } from "./auth";
import { planChat, type PlanChatLlmPort } from "./chat";
import { createChatLlm, MISSING_CHAT_LLM_CONFIG_MESSAGE } from "./create-chat-llm";
import { env } from "./env";
import { logger } from "./logger";
import {
  findChatThread,
  insertChatMessage,
  insertChatThread,
  listChatMessages,
  listChatThreads,
} from "./threads";

const CHAT_LOG_MESSAGE = "chat_request" as const;
const THREADS_LOG_MESSAGE = "chat_threads_request" as const;
const THREAD_NOT_FOUND_MESSAGE = "thread_not_found" as const;
const NOT_FOUND_STATUS = 404 as const;
const BAD_GATEWAY_STATUS = 502 as const;
const PLAN_CHAT_FAILED_MESSAGE = "plan_chat_failed" as const;
const CHAT_TITLE_MAX_LENGTH = 60 as const;
const NEW_CHAT_TITLE = "New chat" as const;

function tryCreateChatLlm(): PlanChatLlmPort | undefined {
  try {
    return createChatLlm();
  } catch (error) {
    if (error instanceof Error && error.message === MISSING_CHAT_LLM_CONFIG_MESSAGE) {
      return undefined;
    }
    throw error;
  }
}

function titleFromChat(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === CHAT_ROLE_USER);
  if (firstUserMessage === undefined) {
    return NEW_CHAT_TITLE;
  }
  return firstUserMessage.content.slice(0, CHAT_TITLE_MAX_LENGTH);
}

function resolveThreadId(
  db: Database,
  input: { userId: string; request: ChatRequest; now: string },
): string {
  if (input.request.thread_id === undefined) {
    const threadId: string = crypto.randomUUID();
    insertChatThread(db, {
      id: threadId,
      userId: input.userId,
      title: titleFromChat(input.request.messages),
      createdAt: input.now,
    });
    return threadId;
  }
  const thread = findChatThread(db, input.request.thread_id);
  if (thread === undefined) {
    throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
  }
  if (thread.user_id !== input.userId) {
    throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
  }
  return thread.id;
}

function storeNewUserTurns(
  db: Database,
  turn: { threadId: string; messages: ChatMessage[]; now: string },
): void {
  const stored = listChatMessages(db, turn.threadId);
  let storedUserCount = 0;
  for (const message of stored) {
    if (message.role === CHAT_ROLE_USER) {
      storedUserCount += 1;
    }
  }
  const freshUserMessages = turn.messages
    .filter((message) => message.role === CHAT_ROLE_USER)
    .slice(storedUserCount);
  for (const message of freshUserMessages) {
    insertChatMessage(db, {
      id: crypto.randomUUID(),
      threadId: turn.threadId,
      role: message.role,
      content: message.content,
      createdAt: turn.now,
    });
  }
}

async function runAssistantTurn(options: {
  db: Database;
  threadId: string;
  request: ChatRequest;
}): Promise<{ message: string; citations: string[] }> {
  const { db, threadId, request } = options;
  let result: { message: string; citations: string[] };
  try {
    result = await planChat(
      { messages: request.messages, invoice: request.invoice },
      {
        llm: tryCreateChatLlm(),
        toolsAvailable: env.TINYFISH_API_KEY !== undefined,
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HTTPException(BAD_GATEWAY_STATUS, { message: PLAN_CHAT_FAILED_MESSAGE });
    }
    throw error;
  }
  insertChatMessage(db, {
    id: crypto.randomUUID(),
    threadId,
    role: CHAT_ROLE_ASSISTANT,
    content: result.message,
    createdAt: new Date().toISOString(),
  });
  logger.info({ threadId }, CHAT_LOG_MESSAGE);
  return result;
}

export function createChatRouter(db: Database) {
  return new Hono()
    .post(API_PATHS.chat, zValidator("json", ChatRequestSchema), async (c) => {
      logger.info({ route: API_PATHS.chat }, CHAT_LOG_MESSAGE);
      const user = await readSessionUser(c, db);
      const body = c.req.valid("json");
      const now: string = new Date().toISOString();
      const threadId: string = resolveThreadId(
        db,
        { userId: user.id, request: body, now },
      );
      storeNewUserTurns(db, { threadId, messages: body.messages, now });
      const result = await runAssistantTurn({ db, threadId, request: body });
      return c.json(
        ChatResponseSchema.parse({
          message: result.message,
          citations: result.citations,
          thread_id: threadId,
        }),
      );
    })
    .get(API_PATHS.chatThreads, async (c) => {
      logger.info({ route: API_PATHS.chatThreads }, THREADS_LOG_MESSAGE);
      const user = await readSessionUser(c, db);
      return c.json(listChatThreads(db, user.id).map((row) => ChatThreadSchema.parse(row)));
    })
    .get(API_PATHS.chatThreadById, async (c) => {
      const user = await readSessionUser(c, db);
      const thread = findChatThread(db, c.req.param("id"));
      if (thread === undefined) {
        throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
      }
      if (thread.user_id !== user.id) {
        throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
      }
      return c.json(
        ChatThreadDetailSchema.parse({
          thread,
          messages: listChatMessages(db, thread.id),
        }),
      );
    });
}
