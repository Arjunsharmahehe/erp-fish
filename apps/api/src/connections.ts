import type { Database } from "bun:sqlite";
import { ConnectionStateSchema, REMOTE_VAULT } from "shared";
import type { UserRow } from "./users";
import { updateUserConnection } from "./users";
import { env } from "./env";
import { removeCredentials, savedCredentials } from "./erp-credentials";
import { connectionSql as CONNECTION_SQL } from "./connection-sql";
import { checkRemoteVault, remoteVaultBinding } from "./remote-vault";

export function connectionState(db: Database, user: UserRow) {
  const saved = user.erp_host ? savedCredentials(db, { userId: user.id, erpHost: user.erp_host }) : null;
  return ConnectionStateSchema.parse({
    erp_host: user.erp_host, profile_id: null, profile_name: null, session_saved: false, checked_at: null,
    provider_configured: Boolean(env.TINYFISH_API_KEY), vault_available: false, credentials_saved: Boolean(saved),
    vault_configured: Boolean(remoteVaultBinding(user)), vault_label: null, vault_message: REMOTE_VAULT.missing,
  });
}
export async function checkedConnectionState(db: Database, user: UserRow) {
  const vault = await checkRemoteVault(user);
  return ConnectionStateSchema.parse({ ...connectionState(db, user), vault_available: vault.ready, vault_label: vault.label, vault_message: vault.message, checked_at: new Date().toISOString() });
}
export function updateConnection(db: Database, { user, erpHost }: { user: UserRow; erpHost: string }) {
  db.transaction(() => {
    if (user.erp_host !== erpHost) {
      db.query(CONNECTION_SQL.clear).run(user.id);
      removeCredentials(db, user.id);
    }
    updateUserConnection(db, { userId: user.id, erpHost, profileId: null });
  })();
  return connectionState(db, { ...user, erp_host: erpHost });
}
