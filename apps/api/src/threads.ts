import type { Database } from "bun:sqlite";
import { ChatMessageSchema, type ChatMessage, type ChatRole } from "shared";
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

const QUERY_INSERT_CHAT_THREAD =
  "INSERT INTO chat_threads(id, user_id, title, created_at) VALUES(?, ?, ?, ?)" as const;
const QUERY_LIST_CHAT_THREADS =
  "SELECT * FROM chat_threads WHERE user_id = ? ORDER BY created_at DESC" as const;
const QUERY_FIND_CHAT_THREAD = "SELECT * FROM chat_threads WHERE id = ?" as const;
const QUERY_INSERT_CHAT_MESSAGE =
  "INSERT INTO chat_messages(id, thread_id, role, content, created_at) VALUES(?, ?, ?, ?, ?)" as const;
const QUERY_LIST_CHAT_MESSAGES =
  "SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC" as const;

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
    return ChatMessageSchema.parse({ role: parsed.role, content: parsed.content });
  });
}
