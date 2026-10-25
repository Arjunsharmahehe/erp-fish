import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { EncryptedModelKeySchema, ERP_CREDENTIALS } from "shared";

const FORMAT = Object.freeze({ algorithm: "aes-256-gcm", encoding: "base64", text: "utf8", separator: "." });
interface EncryptionScope { key: Buffer; associatedData: Buffer }
export function encryptPayload(value: string, scope: EncryptionScope) {
  const iv = randomBytes(ERP_CREDENTIALS.ivBytes);
  const cipher = createCipheriv(FORMAT.algorithm, scope.key, iv);
  cipher.setAAD(scope.associatedData);
  const encrypted = Buffer.concat([cipher.update(value, FORMAT.text), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString(FORMAT.encoding)).join(FORMAT.separator);
}
export function decryptPayload(payload: string, scope: EncryptionScope) {
  const [iv, tag, encrypted] = EncryptedModelKeySchema.parse(payload.split(FORMAT.separator));
  const decipher = createDecipheriv(FORMAT.algorithm, scope.key, Buffer.from(iv, FORMAT.encoding));
  decipher.setAAD(scope.associatedData); decipher.setAuthTag(Buffer.from(tag, FORMAT.encoding));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, FORMAT.encoding)), decipher.final()]).toString(FORMAT.text);
}
