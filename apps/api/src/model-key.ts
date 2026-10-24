import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { EncryptedModelKeySchema, MODEL_SETTINGS } from "shared";
import { env } from "./env";

const CIPHER = "aes-256-gcm";
const HASH = "sha256";
const KEY_CONTEXT = "erp-fish/model-credentials/v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const ENCODING = "base64";
const TEXT = "utf8";
const SEPARATOR = ".";
const UNAVAILABLE = 503;
function encryptionKey() { return Buffer.from(hkdfSync(HASH, env.JWT_SECRET, KEY_CONTEXT, KEY_CONTEXT, KEY_BYTES)); }

export function encryptModelKey(key: string, userId: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(key, TEXT), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString(ENCODING)).join(SEPARATOR);
}
export function decryptModelKey(payload: string, userId: string) {
  try {
    const [iv, tag, encrypted] = EncryptedModelKeySchema.parse(payload.split(SEPARATOR));
    const decipher = createDecipheriv(CIPHER, encryptionKey(), Buffer.from(iv, ENCODING));
    decipher.setAAD(Buffer.from(userId)); decipher.setAuthTag(Buffer.from(tag, ENCODING));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, ENCODING)), decipher.final()]).toString(TEXT);
  } catch { throw new HTTPException(UNAVAILABLE, { message: MODEL_SETTINGS.unavailable }); }
}
