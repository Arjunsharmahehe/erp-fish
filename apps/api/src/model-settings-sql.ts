export const modelSettingsSql = {
  schema: "CREATE TABLE IF NOT EXISTS model_settings(user_id TEXT PRIMARY KEY, completion_url TEXT NOT NULL, model TEXT NOT NULL, encrypted_key TEXT NOT NULL)",
  find: "SELECT user_id, completion_url, model, encrypted_key FROM model_settings WHERE user_id=?",
  save: "INSERT INTO model_settings(user_id, completion_url, model, encrypted_key) VALUES(?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET completion_url=excluded.completion_url, model=excluded.model, encrypted_key=excluded.encrypted_key",
  remove: "DELETE FROM model_settings WHERE user_id=?",
};
