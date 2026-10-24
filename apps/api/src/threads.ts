import type { Database } from "bun:sqlite";
import { ChatMessageSchema, ChatResponseSchema, StoredChatDetailsSchema, type ChatResponse, type ChatMessage, type ChatRole, type ThreadUpdate } from "shared";
import {
  ChatMessageRowSchema,
  ChatThreadRowSchema,
  type ChatMessageRow,
  type ChatThreadRow,
} from "./rows";

export const SCHEMA_CHAT_THREADS = `CREATE TABLE IF NOT EXISTS chat_threads(
id TEXT PRIMARY KEY,
user_id TEXT NOT NULL,
title TEXT NOT NULL,
created_at TEXT NOT NULL
)` as const;

export const SCHEMA_CHAT_MESSAGES = `CREATE TABLE IF NOT EXISTS chat_messages(
id TEXT PRIMARY KEY,
thread_id TEXT NOT NULL,
role TEXT NOT NULL,
content TEXT NOT NULL,
created_at TEXT NOT NULL
)` as const;

export const SCHEMA_THREAD_STATE = `CREATE TABLE IF NOT EXISTS chat_thread_state(
thread_id TEXT PRIMARY KEY,
pinned INTEGER NOT NULL DEFAULT 0,
archived INTEGER NOT NULL DEFAULT 0
)`;

const THREAD_SELECT = "SELECT t.*, COALESCE(s.pinned, 0) AS pinned, COALESCE(s.archived, 0) AS archived FROM chat_threads t LEFT JOIN chat_thread_state s ON s.thread_id = t.id";
export const SCHEMA_CHAT_DETAILS = "CREATE TABLE IF NOT EXISTS chat_message_details(message_id TEXT PRIMARY KEY, details TEXT NOT NULL)";
const INSERT_CHAT_DETAILS = "INSERT INTO chat_message_details(message_id, details) VALUES(?, ?)";
const DELETE_CHAT_DETAILS = "DELETE FROM chat_message_details WHERE message_id IN (SELECT id FROM chat_messages WHERE thread_id = ?)";

const QUERY_INSERT_CHAT_THREAD =
  "INSERT INTO chat_threads(id, user_id, title, created_at) VALUES(?, ?, ?, ?)" as const;
const QUERY_LIST_CHAT_THREADS =
  `${THREAD_SELECT} WHERE t.user_id = ? ORDER BY pinned DESC, t.created_at DESC, t.id DESC`;
const QUERY_FIND_CHAT_THREAD = `${THREAD_SELECT} WHERE t.id = ?`;
const QUERY_INSERT_CHAT_MESSAGE =
  "INSERT INTO chat_messages(id, thread_id, role, content, created_at) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_LIST_CHAT_MESSAGES =
  "SELECT m.*, d.details FROM chat_messages m LEFT JOIN chat_message_details d ON d.message_id = m.id WHERE m.thread_id = ? ORDER BY m.created_at ASC, m.rowid ASC" as const;
const UPDATE_THREAD_TITLE = "UPDATE chat_threads SET title = ? WHERE id = ?";
const UPSERT_THREAD_STATE = "INSERT INTO chat_thread_state(thread_id, pinned, archived) VALUES(?, ?, ?) ON CONFLICT(thread_id) DO UPDATE SET pinned = excluded.pinned, archived = excluded.archived";
const DELETE_THREAD_MESSAGES = "DELETE FROM chat_messages WHERE thread_id = ?";
const DELETE_THREAD_STATE = "DELETE FROM chat_thread_state WHERE thread_id = ?";
const DELETE_THREAD = "DELETE FROM chat_threads WHERE id = ?";

export function updateChatThread(db: Database, options: { thread: ChatThreadRow; update: ThreadUpdate }): void {
  const { thread, update } = options;
  db.transaction(() => {
    if (update.title !== undefined) db.query(UPDATE_THREAD_TITLE).run(update.title, thread.id);
    db.query(UPSERT_THREAD_STATE).run(thread.id, Number(update.pinned ?? thread.pinned), Number(update.archived ?? thread.archived));
  })();
}

export function deleteChatThread(db: Database, threadId: string): void {
  db.transaction(() => {
    db.query(DELETE_CHAT_DETAILS).run(threadId);
    db.query(DELETE_THREAD_MESSAGES).run(threadId);
    db.query(DELETE_THREAD_STATE).run(threadId);
    db.query(DELETE_THREAD).run(threadId);
  })();
}

export function insertChatThread(
  db: Database,
  row: { id: string; userId: string; title: string; createdAt: string },
): void {
  db.query(QUERY_INSERT_CHAT_THREAD).run(row.id, row.userId, row.title, row.createdAt);
}

export function findChatThread(db: Database, threadId: string): ChatThreadRow | undefined {
  const row: unknown = db.query(QUERY_FIND_CHAT_THREAD).get(threadId);
  if (row === null || row === undefined) {
    return undefined;
  }
  return ChatThreadRowSchema.parse(row);
}

export function listChatThreads(db: Database, userId: string): ChatThreadRow[] {
  const rows: unknown[] = db.query(QUERY_LIST_CHAT_THREADS).all(userId);
  return rows.map((row) => ChatThreadRowSchema.parse(row));
}

export function insertChatMessage(
  db: Database,
  row: { id: string; threadId: string; role: ChatRole; content: string; createdAt: string },
): void {
  db.query(QUERY_INSERT_CHAT_MESSAGE).run(
    row.id,
    row.threadId,
    row.role,
    row.content,
    row.createdAt,
  );
}

export function listChatMessages(db: Database, threadId: string): ChatMessage[] {
  const rows: unknown[] = db.query(QUERY_LIST_CHAT_MESSAGES).all(threadId);
  return rows.map((row) => {
    const parsed: ChatMessageRow = ChatMessageRowSchema.parse(row);
    const stored = StoredChatDetailsSchema.parse(row);
    const details = stored.details === null ? undefined : ChatResponseSchema.parse(JSON.parse(stored.details));
    return ChatMessageSchema.parse({ role: parsed.role, content: parsed.content, activity: details?.activity, citations: details?.citations });
  });
}

export function insertAssistantReply(db: Database, response: ChatResponse): void {
  const id = crypto.randomUUID();
  db.transaction(() => {
    insertChatMessage(db, { id, threadId: response.thread_id, role: "assistant", content: response.message, createdAt: new Date().toISOString() });
    db.query(INSERT_CHAT_DETAILS).run(id, JSON.stringify(response));
  })();
}
