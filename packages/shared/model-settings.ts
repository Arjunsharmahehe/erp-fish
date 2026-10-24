import { z } from "zod";

const MIN = 1;
const MAX_URL = 2048;
const MAX_MODEL = 200;
const MAX_KEY = 4096;
const HTTPS = "https:";
export const MODEL_SETTINGS = Object.freeze({
  path: "/api/auth/model", completionSuffix: "/chat/completions",
  missing: "Add your completion URL, model, and API key in Settings.",
  invalidUrl: "Enter a public HTTPS OpenAI-compatible completion URL without credentials, query parameters, or a fragment.",
  keyRequired: "Enter an API key to save this model connection.",
  newHostKey: "Enter an API key for the new provider before saving.",
  unavailable: "The saved model connection could not be opened. Re-enter its API key in Settings.",
  requestFailed: "The model provider could not complete the request. Check your model settings and try again.",
});
export const CompletionUrlSchema = z.url().max(MAX_URL).refine((value) => {
  const url = new URL(value);
  return url.protocol === HTTPS && !url.username && !url.password && !url.search && !url.hash;
}, MODEL_SETTINGS.invalidUrl).transform((value) => {
  const url = new URL(value);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith(MODEL_SETTINGS.completionSuffix) ? path : `${path}${MODEL_SETTINGS.completionSuffix}`;
  return url.toString();
});
const ModelCodeSchema = z.string().trim().min(MIN).max(MAX_MODEL);
const ApiKeySchema = z.string().trim().min(MIN).max(MAX_KEY);
export const ModelSettingsUpdateSchema = z.object({ completion_url: CompletionUrlSchema, model: ModelCodeSchema, api_key: ApiKeySchema.optional() }).strict();
export const ModelSettingsStateSchema = z.object({ completion_url: z.string(), model: z.string(), has_key: z.boolean(), source: z.enum(["personal", "server", "none"]) });
export const ModelSettingsRowSchema = z.object({ user_id: z.string(), completion_url: CompletionUrlSchema, model: ModelCodeSchema, encrypted_key: z.string().min(MIN) });
export const ModelCredentialSchema = z.object({ completion_url: CompletionUrlSchema, model: ModelCodeSchema, api_key: ApiKeySchema });
export const EncryptedModelKeySchema = z.tuple([z.base64(), z.base64(), z.base64()]);
export type ModelSettingsState = z.infer<typeof ModelSettingsStateSchema>;
export type ModelSettingsUpdate = z.infer<typeof ModelSettingsUpdateSchema>;
export type ModelCredential = z.infer<typeof ModelCredentialSchema>;
