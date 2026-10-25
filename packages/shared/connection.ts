import { z } from "zod";
const MIN = 1;
const ZERO = 0;
const HTTPS = "https:";
const HTTP = "http:";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
export const ERP_URL_ERROR = "Enter an HTTPS ERP URL. Private HTTP endpoints are available in local deployments. Do not include credentials, a query, or a fragment.";
const ROOT_PATH = "/";
export const ErpUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && !url.search && !url.hash && (url.protocol === HTTPS || url.protocol === HTTP);
}, ERP_URL_ERROR).transform((value) => {
  const url = new URL(value);
  return url.pathname === ROOT_PATH ? url.origin : url.href;
});
export const HostedErpUrlSchema = ErpUrlSchema.refine((value) => {
  const url = new URL(value);
  return url.protocol === HTTPS || LOCAL_HOSTS.includes(url.hostname);
}, ERP_URL_ERROR);
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
  credentials_saved: z.boolean().default(false),
  vault_configured: z.boolean().default(false), vault_label: z.string().nullable().default(null),
  vault_message: z.string().nullable().default(null),
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
