import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import type { MemoryScope } from "shared";
export const THREAD_SCOPE_SQL = {
  schema: "CREATE TABLE IF NOT EXISTS thread_scopes(thread_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,erp_host TEXT NOT NULL)",
  bind: "INSERT OR IGNORE INTO thread_scopes(thread_id,user_id,erp_host) VALUES(?,?,?)",
  matches: "SELECT thread_id FROM thread_scopes WHERE thread_id=? AND user_id=? AND erp_host=?",
};
const CONFLICT = 409;
const CHANGED = "This conversation belongs to a different ERP URL. Start a new conversation or restore that URL in Settings.";
export function requireThreadScope(db: Database, { threadId, scope }: { threadId: string; scope: MemoryScope }) {
  db.query(THREAD_SCOPE_SQL.bind).run(threadId, scope.userId, scope.erpHost);
  const row: unknown = db.query(THREAD_SCOPE_SQL.matches).get(threadId, scope.userId, scope.erpHost);
  if (!row) throw new HTTPException(CONFLICT, { message: CHANGED });
}
