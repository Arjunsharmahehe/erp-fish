import type { Database } from "bun:sqlite";
import { BrowserColumnSchema } from "shared";

export const browserSql = Object.freeze({
  preferences: "CREATE TABLE IF NOT EXISTS browser_preferences(user_id TEXT PRIMARY KEY,provider TEXT NOT NULL)",
  runs: "CREATE TABLE IF NOT EXISTS local_browser_runs(id TEXT PRIMARY KEY,status TEXT NOT NULL,result_json TEXT,error TEXT)",
  cookies: "CREATE TABLE IF NOT EXISTS local_browser_cookies(profile_id TEXT PRIMARY KEY,encrypted_cookies TEXT NOT NULL)",
  readCookies: "SELECT encrypted_cookies FROM local_browser_cookies WHERE profile_id=?",
  saveCookies: "INSERT INTO local_browser_cookies(profile_id,encrypted_cookies) VALUES(?,?) ON CONFLICT(profile_id) DO UPDATE SET encrypted_cookies=excluded.encrypted_cookies",
  preference: "SELECT provider FROM browser_preferences WHERE user_id=?",
  savePreference: "INSERT INTO browser_preferences(user_id,provider) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET provider=excluded.provider",
  insertRun: "INSERT INTO local_browser_runs(id,status) VALUES(?,'running')",
  readRun: "SELECT * FROM local_browser_runs WHERE id=?",
  finishRun: "UPDATE local_browser_runs SET status=?,result_json=?,error=? WHERE id=? AND status='running'",
  interrupted: "UPDATE local_browser_runs SET status='failed',error=? WHERE status='running'",
});
const MIGRATIONS = [
  { query: "PRAGMA table_info(agent_runs)", alter: "ALTER TABLE agent_runs ADD COLUMN provider TEXT NOT NULL DEFAULT 'tinyfish'" },
  { query: "PRAGMA table_info(agent_sessions)", alter: "ALTER TABLE agent_sessions ADD COLUMN provider TEXT NOT NULL DEFAULT 'tinyfish'" },
];
const PROVIDER_COLUMN = "provider";
export function migrateBrowserStorage(db: Database) {
  db.run(browserSql.preferences); db.run(browserSql.runs); db.run(browserSql.cookies);
  for (const migration of MIGRATIONS) {
    if (!BrowserColumnSchema.array().parse(db.query(migration.query).all()).some((column) => column.name === PROVIDER_COLUMN)) db.run(migration.alter);
  }
}
