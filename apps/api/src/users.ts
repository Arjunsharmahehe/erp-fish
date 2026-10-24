import type { Database } from "bun:sqlite";
import { UserRowSchema, type UserRow } from "./rows";

export type { UserRow } from "./rows";

export const SCHEMA_USERS = `CREATE TABLE IF NOT EXISTS users(
id TEXT PRIMARY KEY,
email TEXT NOT NULL UNIQUE,
password_hash TEXT NOT NULL,
erp_host TEXT,
profile_id TEXT,
created_at TEXT NOT NULL
)` as const;

const QUERY_INSERT_USER =
  "INSERT INTO users(id, email, password_hash, erp_host, profile_id, created_at) VALUES(?, ?, ?, ?, ?, ?)" as const;
const QUERY_FIND_USER_BY_EMAIL = "SELECT * FROM users WHERE email = ?" as const;
const QUERY_FIND_USER_BY_ID = "SELECT * FROM users WHERE id = ?" as const;
const QUERY_UPDATE_USER_CONNECTION =
  "UPDATE users SET erp_host = ?, profile_id = ? WHERE id = ?" as const;

export function insertUser(
  db: Database,
  row: {
    id: string;
    email: string;
    passwordHash: string;
    erpHost: string | null;
    profileId: string | null;
    createdAt: string;
  },
): void {
  db.query(QUERY_INSERT_USER).run(
    row.id,
    row.email,
    row.passwordHash,
    row.erpHost,
    row.profileId,
    row.createdAt,
  );
}

export function findUserByEmail(db: Database, email: string): UserRow | undefined {
  const row: unknown = db.query(QUERY_FIND_USER_BY_EMAIL).get(email);
  if (row === null || row === undefined) {
    return undefined;
  }
  return UserRowSchema.parse(row);
}

export function findUserById(db: Database, userId: string): UserRow | undefined {
  const row: unknown = db.query(QUERY_FIND_USER_BY_ID).get(userId);
  if (row === null || row === undefined) {
    return undefined;
  }
  return UserRowSchema.parse(row);
}

export function updateUserConnection(
  db: Database,
  update: { userId: string; erpHost: string; profileId: string | null },
): void {
  db.query(QUERY_UPDATE_USER_CONNECTION).run(update.erpHost, update.profileId, update.userId);
}
