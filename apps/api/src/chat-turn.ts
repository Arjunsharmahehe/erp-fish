import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import {
  CHAT_ROLE_USER,
  ChatResponseSchema,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ChatActivity,
  CHAT_ACTIVITY,
} from "shared";
import type { ActivityListener } from "./chat-progress";
import { planChat, type PlanChatLlmPort } from "./chat";
import { createChatLlm, MISSING_CHAT_LLM_CONFIG_MESSAGE } from "./create-chat-llm";
import { env } from "./env";
import { logger } from "./logger";
import { findUserById } from "./users";
import { userMemoryScope } from "./learning-router";
import { listSavedMemories, listLearningQuestions } from "./learning";
import { LEARNING_PROMPT, type LearningToolContext } from "./learning-tools";
import { withChatLock } from "./chat-lock";
import { requireThreadScope } from "./thread-scope";
import { resolveModelConfig } from "./model-settings";
import {
  findChatThread,
  insertChatMessage,
  insertChatThread,
  listChatMessages,
  insertAssistantReply,
} from "./threads";

const CHAT_LOG_MESSAGE = "chat_request" as const;
const THREAD_NOT_FOUND_MESSAGE = "thread_not_found" as const;
const NOT_FOUND_STATUS = 404 as const;
const BAD_GATEWAY_STATUS = 502 as const;
const PLAN_CHAT_FAILED_MESSAGE = "plan_chat_failed" as const;
const CHAT_TITLE_MAX_LENGTH = 60 as const;
const NEW_CHAT_TITLE = "New chat" as const;
const LEARNING_SEPARATOR = "\n";
const QUESTION_WAITING = "I need one detail before continuing. Please answer the question below.";
const QUESTION_PAUSE_LOG = "chat_paused_after_response_failure";
function recoverQuestionPause(cause: unknown, learning: LearningToolContext) {
  const pending = listLearningQuestions(learning.db, { scope: learning.scope, sourceType: "chat", sourceId: learning.threadId }).some((question) => question.status === "pending");
  if (pending) {
    logger.warn({ threadId: learning.threadId, errorType: cause instanceof Error ? cause.name : typeof cause }, QUESTION_PAUSE_LOG);
    return { message: QUESTION_WAITING, citations: [] };
  }
  if (cause instanceof ZodError) throw new HTTPException(BAD_GATEWAY_STATUS, { message: PLAN_CHAT_FAILED_MESSAGE });
  throw cause;
}
export function ownedThread(db: Database, options: { threadId: string; userId: string }) {
  const thread = findChatThread(db, options.threadId);
  if (thread?.user_id !== options.userId) {
    throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
  }
  return thread;
}

function tryCreateChatLlm(options: { sessionId: string; onActivity: ActivityListener; learning: LearningToolContext }): PlanChatLlmPort | undefined {
  try {
    return createChatLlm({ ...options, config: resolveModelConfig(options.learning.db, options.learning.scope.userId) });
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
  return (firstUserMessage.original?.text ?? firstUserMessage.content).slice(0, CHAT_TITLE_MAX_LENGTH);
}

export function resolveThreadId(
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
  const thread = ownedThread(db, { threadId: input.request.thread_id, userId: input.userId });
  return thread.id;
}

export function storeNewUserTurns(
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
      original: message.original,
      attachment: message.attachment,
      createdAt: turn.now,
    });
  }
}

async function executeAssistantTurn(options: {
  db: Database;
  threadId: string;
  request: ChatRequest;
  onActivity?: ActivityListener;
}): Promise<ChatResponse> {
  const { db, threadId, request } = options;
  const thread = findChatThread(db, threadId);
  const user = thread ? findUserById(db, thread.user_id) : undefined;
  if (!user) throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
  const scope = userMemoryScope(user);
  requireThreadScope(db, { threadId, scope });
  const learning = { db, scope, threadId, invoiceJson: request.invoice ? JSON.stringify(request.invoice) : undefined };
  const learningContext = [LEARNING_PROMPT, JSON.stringify({
    saved_memories: listSavedMemories(db, scope),
    questionnaire_history: listLearningQuestions(db, { scope, sourceType: "chat", sourceId: threadId }),
  })].join(LEARNING_SEPARATOR);
  const activity = new Map<string, ChatActivity>();
  const notify: ActivityListener = (step) => { activity.set(step.id, step); options.onActivity?.(step); };
  let result: { message: string; citations: string[] };
  try {
    result = await planChat(
      { messages: listChatMessages(db, threadId), invoice: request.invoice, learningContext },
      {
        llm: tryCreateChatLlm({ sessionId: threadId, onActivity: notify, learning }),
        toolsAvailable: env.TINYFISH_API_KEY !== undefined,
      },
    );
  } catch (error) {
    result = recoverQuestionPause(error, learning);
  }
  // A conversation can be deleted while the model request is in flight.
  if (findChatThread(db, threadId) === undefined) {
    throw new HTTPException(NOT_FOUND_STATUS, { message: THREAD_NOT_FOUND_MESSAGE });
  }
  for (const step of activity.values()) {
    if (step.status === CHAT_ACTIVITY.running) notify({ ...step, status: CHAT_ACTIVITY.complete });
  }
  const response = ChatResponseSchema.parse({ ...result, thread_id: threadId, activity: [...activity.values()] });
  insertAssistantReply(db, response);
  logger.info({ threadId }, CHAT_LOG_MESSAGE);
  return response;
}

export function runAssistantTurn(options: Parameters<typeof executeAssistantTurn>[0]) {
  return withChatLock(options.threadId, () => executeAssistantTurn(options));
}
