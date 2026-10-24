import { z } from "zod";
const MIN = 1;
const ZERO = 0;
const HTTPS = "https:";
const HTTP = "http:";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const URL_ERROR = "Enter an HTTPS ERP URL (HTTP is allowed for localhost). Do not include credentials, a query, or a fragment.";
export const ErpUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash && (url.protocol === HTTPS || (url.protocol === HTTP && LOCAL_HOSTS.includes(url.hostname)));
}, URL_ERROR).transform((value) => new URL(value).origin);
export const ConnectionUpdateSchema = z.object({ erp_host: ErpUrlSchema }).strict();
export const TinyProfileSchema = z.object({
  id: z.string().min(MIN), name: z.string(),
  domains: z.array(z.object({ domain: z.string(), cookie_count: z.number().min(ZERO) })).default([]),
});
export const ConnectionStateSchema = z.object({
  erp_host: z.string().nullable(), profile_id: z.string().nullable(),
  profile_name: z.string().nullable(), session_saved: z.boolean(),
  checked_at: z.string().nullable(), provider_configured: z.boolean(),
  vault_available: z.boolean(),
});
export const ConnectionRowSchema = z.object({
  user_id: z.string(), erp_host: z.string(), profile_id: z.string(),
  profile_name: z.string(), session_saved: z.coerce.boolean(),
  checked_at: z.string().nullable(), vault_available: z.coerce.boolean(),
});
export const CONNECTION_PATHS = Object.freeze({
  settings: "/api/auth/settings", reconnect: "/api/auth/connection/reconnect",
  refresh: "/api/auth/connection/refresh",
});
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
