import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { ERP_CREDENTIALS, ErpCredentialsSchema, ErpCredentialRowSchema, type ErpCredentials } from "shared";
import { env } from "./env";
import { erpCredentialSql as SQL } from "./erp-credential-sql";
import { encryptPayload, decryptPayload } from "./encrypted-payload";

const CONFIG_UNAVAILABLE = 503;
const ENCRYPTION = Object.freeze({ encoding: "base64", unavailable: CONFIG_UNAVAILABLE });
export interface CredentialScope { userId: string; erpHost: string }
function localKey() {
  if (!env.ERP_CREDENTIALS_KEY) throw new HTTPException(ENCRYPTION.unavailable, { message: ERP_CREDENTIALS.unavailable });
  return Buffer.from(env.ERP_CREDENTIALS_KEY, ENCRYPTION.encoding);
}
function associatedData(scope: CredentialScope) { return Buffer.from(JSON.stringify([scope.userId, scope.erpHost])); }
export function savedCredentials(db: Database, scope: CredentialScope) {
  const row = db.query(SQL.find).get(scope.userId, scope.erpHost);
  return row ? ErpCredentialRowSchema.parse(row) : null;
}
export function saveCredentials(db: Database, { scope, input }: { scope: CredentialScope; input: ErpCredentials }) {
  const credentials = ErpCredentialsSchema.parse(input);
  const payload = encryptPayload(JSON.stringify(credentials), { key: localKey(), associatedData: associatedData(scope) });
  db.query(SQL.save).run(scope.userId, scope.erpHost, payload, crypto.randomUUID());
}
export function readCredentials(db: Database, scope: CredentialScope) {
  const row = savedCredentials(db, scope);
  if (!row) throw new HTTPException(ENCRYPTION.unavailable, { message: ERP_CREDENTIALS.missing });
  const key = localKey();
  try {
    const plain = decryptPayload(row.encrypted_credentials, { key, associatedData: associatedData(scope) });
    return { credentials: ErpCredentialsSchema.parse(JSON.parse(plain)), revision: row.revision };
  } catch { throw new HTTPException(ENCRYPTION.unavailable, { message: ERP_CREDENTIALS.invalid }); }
}
export function removeCredentials(db: Database, userId: string) { db.query(SQL.remove).run(userId); }
