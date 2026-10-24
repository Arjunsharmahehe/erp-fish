export const connectionSql = {
  schema: "CREATE TABLE IF NOT EXISTS user_connections(user_id TEXT PRIMARY KEY,erp_host TEXT NOT NULL,profile_id TEXT NOT NULL,profile_name TEXT NOT NULL,session_saved INTEGER NOT NULL DEFAULT 0,checked_at TEXT,vault_available INTEGER NOT NULL DEFAULT 0)",
  find: "SELECT * FROM user_connections WHERE user_id=? AND erp_host=?",
  save: "INSERT INTO user_connections(user_id,erp_host,profile_id,profile_name) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET erp_host=excluded.erp_host,profile_id=excluded.profile_id,profile_name=excluded.profile_name,session_saved=0,checked_at=NULL,vault_available=0",
  clear: "DELETE FROM user_connections WHERE user_id=?",
  checked: "UPDATE user_connections SET session_saved=?,checked_at=?,vault_available=? WHERE user_id=? AND erp_host=? AND profile_id=?",
};
