import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { CompletionUrlSchema, ModelCredentialSchema, ModelSettingsRowSchema, ModelSettingsStateSchema, MODEL_SETTINGS, type ModelSettingsUpdate } from "shared";
import { env } from "./env";
import { decryptModelKey, encryptModelKey } from "./model-key";
import { resolveModelEndpoint } from "./resolve-model-endpoint";
import { modelSettingsSql as MODEL_SETTINGS_SQL } from "./model-settings-sql";
const BAD_REQUEST = 400;
function savedModel(db: Database, userId: string) {
  const row = db.query(MODEL_SETTINGS_SQL.find).get(userId);
  return row ? ModelSettingsRowSchema.parse(row) : undefined;
}
function defaultModel() {
  const parsed = ModelCredentialSchema.safeParse({ completion_url: env.OPENAI_BASE_URL, model: env.OPENAI_MODEL, api_key: env.OPENAI_API_KEY });
  return parsed.success ? parsed.data : undefined;
}
export function modelSettingsState(db: Database, userId: string) {
  const saved = savedModel(db, userId);
  const config = saved ?? defaultModel();
  return ModelSettingsStateSchema.parse({ completion_url: config?.completion_url ?? "", model: config?.model ?? "", has_key: Boolean(config), source: saved ? "personal" : config ? "server" : "none" });
}
export function resolveModelConfig(db: Database, userId: string) {
  const row = savedModel(db, userId);
  if (!row) return defaultModel();
  return ModelCredentialSchema.parse({ ...row, api_key: decryptModelKey(row.encrypted_key, userId) });
}
export async function saveModelSettings(db: Database, options: { userId: string; input: ModelSettingsUpdate }) {
  const { userId, input } = options;
  const previous = savedModel(db, userId);
  if (!input.api_key && !previous) throw new HTTPException(BAD_REQUEST, { message: MODEL_SETTINGS.keyRequired });
  if (!input.api_key && previous && new URL(previous.completion_url).origin !== new URL(input.completion_url).origin) throw new HTTPException(BAD_REQUEST, { message: MODEL_SETTINGS.newHostKey });
  await resolveModelEndpoint(CompletionUrlSchema.parse(input.completion_url));
  const encrypted = input.api_key ? encryptModelKey(input.api_key, userId) : previous?.encrypted_key;
  if (!encrypted) throw new HTTPException(BAD_REQUEST, { message: MODEL_SETTINGS.keyRequired });
  db.query(MODEL_SETTINGS_SQL.save).run(userId, input.completion_url, input.model, encrypted);
  return modelSettingsState(db, userId);
}
export function removeModelSettings(db: Database, userId: string) {
  db.query(MODEL_SETTINGS_SQL.remove).run(userId);
  return modelSettingsState(db, userId);
}
