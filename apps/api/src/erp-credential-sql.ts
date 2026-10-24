export const erpCredentialSql = Object.freeze({
  schema: "CREATE TABLE IF NOT EXISTS erp_credentials(user_id TEXT PRIMARY KEY,erp_host TEXT NOT NULL,encrypted_credentials TEXT NOT NULL,revision TEXT NOT NULL)",
  find: "SELECT * FROM erp_credentials WHERE user_id=? AND erp_host=?",
  save: "INSERT INTO erp_credentials(user_id,erp_host,encrypted_credentials,revision) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET erp_host=excluded.erp_host,encrypted_credentials=excluded.encrypted_credentials,revision=excluded.revision",
  remove: "DELETE FROM erp_credentials WHERE user_id=?",
});
