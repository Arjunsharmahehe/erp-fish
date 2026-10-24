import type { Database } from "bun:sqlite";
import { TinyFish } from "@tiny-fish/sdk";
import { HTTPException } from "hono/http-exception";
import { ConnectionRowSchema, ConnectionStateSchema, TinyProfileSchema } from "shared";
import type { UserRow } from "./users";
import { findUserById, updateUserConnection } from "./users";
import { env } from "./env";

import { connectionSql as CONNECTION_SQL } from "./connection-sql";
const SERVICE_UNAVAILABLE = 503;
const CONFLICT_STATUS = 409;
const PROVIDER_TIMEOUT_MS = 30000;
const PROVIDER = Object.freeze({
  url: "https://agent.tinyfish.ai/v1/profiles", apiKey: "X-API-Key", json: "application/json",
  contentType: "Content-Type", missing: "TinyFish is not configured. Your ERP URL can still be saved.",
  unavailable: "TinyFish could not complete this connection request. Please try again.",
  hostRequired: "Save your ERP URL first.", reconnectRequired: "Start a connection before checking its status.",
  status: SERVICE_UNAVAILABLE, conflict: CONFLICT_STATUS, timeoutMs: PROVIDER_TIMEOUT_MS, name: "ERP Fish",
  changed: "The ERP URL changed during setup. Please start the connection again.",
});
function connectionRow(db: Database, user: UserRow) {
  const row: unknown = db.query(CONNECTION_SQL.find).get(user.id, user.erp_host);
  return row ? ConnectionRowSchema.parse(row) : null;
}
export function connectionState(db: Database, user: UserRow) {
  const row = connectionRow(db, user) ?? { profile_id: null, profile_name: null, session_saved: false, checked_at: null, vault_available: false };
  return ConnectionStateSchema.parse({
    erp_host: user.erp_host, profile_id: row.profile_id, profile_name: row.profile_name,
    session_saved: row.session_saved, checked_at: row.checked_at,
    provider_configured: env.TINYFISH_API_KEY !== undefined, vault_available: row.vault_available,
  });
}
export function updateConnection(db: Database, { user, erpHost }: { user: UserRow; erpHost: string }) {
  db.transaction(() => {
    if (user.erp_host !== erpHost) db.query(CONNECTION_SQL.clear).run(user.id);
    updateUserConnection(db, { userId: user.id, erpHost, profileId: user.erp_host === erpHost ? user.profile_id : null });
  })();
  return connectionState(db, { ...user, erp_host: erpHost });
}
async function profileRequest(path: string, body?: { name: string; set_as_default: boolean }) {
  const key = env.TINYFISH_API_KEY;
  if (!key) throw new HTTPException(PROVIDER.status, { message: PROVIDER.missing });
  try {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { [PROVIDER.apiKey]: key, [PROVIDER.contentType]: PROVIDER.json },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(PROVIDER.timeoutMs),
    });
    if (!response.ok) throw new HTTPException(PROVIDER.status, { message: PROVIDER.unavailable });
    return TinyProfileSchema.parse(await response.json());
  } catch {
    throw new HTTPException(PROVIDER.status, { message: PROVIDER.unavailable });
  }
}
const connecting = new Set<string>();
export async function reconnectProfile(db: Database, user: UserRow) {
  if (!user.erp_host) throw new HTTPException(PROVIDER.conflict, { message: PROVIDER.hostRequired });
  if (connecting.has(user.id)) throw new HTTPException(PROVIDER.conflict, { message: PROVIDER.reconnectRequired });
  const existing = connectionRow(db, user);
  if (existing) return connectionState(db, user);
  connecting.add(user.id);
  try {
    const profile = await profileRequest(PROVIDER.url, { name: `${PROVIDER.name} · ${new URL(user.erp_host).hostname} · ${user.id}`, set_as_default: false });
    db.transaction(() => {
      if (findUserById(db, user.id)?.erp_host !== user.erp_host) throw new HTTPException(PROVIDER.conflict, { message: PROVIDER.changed });
      db.query(CONNECTION_SQL.save).run(user.id, user.erp_host, profile.id, profile.name);
      updateUserConnection(db, { userId: user.id, erpHost: user.erp_host ?? PROVIDER.hostRequired, profileId: profile.id });
    })();
    return connectionState(db, user);
  } finally { connecting.delete(user.id); }
}
export async function refreshConnection(db: Database, user: UserRow) {
  const row = connectionRow(db, user);
  if (!row) throw new HTTPException(PROVIDER.conflict, { message: PROVIDER.reconnectRequired });
  const profile = await profileRequest(`${PROVIDER.url}/${encodeURIComponent(row.profile_id)}`);
  const host = new URL(row.erp_host).hostname;
  const saved = profile.domains.some((domain) => domain.domain === host && domain.cookie_count > 0);
  // Vault only reports display-safe metadata. Credentials stay in the provider.
  let available = false;
  if (env.TINYFISH_API_KEY) {
    try {
      const vault = new TinyFish({ apiKey: env.TINYFISH_API_KEY }).vault;
      const connections = await vault.connections.list();
      if (connections.connections.length) {
        const synced = await vault.items.sync();
        available = synced.items.some((item) => item.domains.some((domain) => domain === host || domain === row.erp_host));
      }
    } catch { throw new HTTPException(PROVIDER.status, { message: PROVIDER.unavailable }); }
  }
  db.query(CONNECTION_SQL.checked).run(saved, new Date().toISOString(), available, user.id, row.erp_host, row.profile_id);
  return connectionState(db, user);
}
