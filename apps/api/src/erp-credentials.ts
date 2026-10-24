import type { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { EncryptedModelKeySchema, ERP_CREDENTIALS, ErpCredentialsSchema, ErpCredentialRowSchema, type ErpCredentials } from "shared";
import { env } from "./env";
import { erpCredentialSql as SQL } from "./erp-credential-sql";

const CONFIG_UNAVAILABLE = 503;
const ENCRYPTION = Object.freeze({ algorithm: "aes-256-gcm", encoding: "base64", text: "utf8", separator: ".", unavailable: CONFIG_UNAVAILABLE });
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
  const iv = randomBytes(ERP_CREDENTIALS.ivBytes);
  const cipher = createCipheriv(ENCRYPTION.algorithm, localKey(), iv);
  cipher.setAAD(associatedData(scope));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), ENCRYPTION.text), cipher.final()]);
  const payload = [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString(ENCRYPTION.encoding)).join(ENCRYPTION.separator);
  db.query(SQL.save).run(scope.userId, scope.erpHost, payload, crypto.randomUUID());
}
export function readCredentials(db: Database, scope: CredentialScope) {
  const row = savedCredentials(db, scope);
  if (!row) throw new HTTPException(ENCRYPTION.unavailable, { message: ERP_CREDENTIALS.missing });
  const key = localKey();
  try {
    const [iv, tag, encrypted] = EncryptedModelKeySchema.parse(row.encrypted_credentials.split(ENCRYPTION.separator));
    const decipher = createDecipheriv(ENCRYPTION.algorithm, key, Buffer.from(iv, ENCRYPTION.encoding));
    decipher.setAAD(associatedData(scope)); decipher.setAuthTag(Buffer.from(tag, ENCRYPTION.encoding));
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, ENCRYPTION.encoding)), decipher.final()]).toString(ENCRYPTION.text);
    return { credentials: ErpCredentialsSchema.parse(JSON.parse(plain)), revision: row.revision };
  } catch { throw new HTTPException(ENCRYPTION.unavailable, { message: ERP_CREDENTIALS.invalid }); }
}
export function removeCredentials(db: Database, userId: string) { db.query(SQL.remove).run(userId); }
