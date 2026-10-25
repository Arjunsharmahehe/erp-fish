import { hkdfSync } from "node:crypto";
import { HTTPException } from "hono/http-exception";
import { MODEL_SETTINGS } from "shared";
import { env } from "./env";
import { encryptPayload, decryptPayload } from "./encrypted-payload";

const HASH = "sha256";
const KEY_CONTEXT = "erp-fish/model-credentials/v1";
const KEY_BYTES = 32;
const UNAVAILABLE = 503;
function encryptionKey() { return Buffer.from(hkdfSync(HASH, env.JWT_SECRET, KEY_CONTEXT, KEY_CONTEXT, KEY_BYTES)); }

export function encryptModelKey(key: string, userId: string) {
  return encryptPayload(key, { key: encryptionKey(), associatedData: Buffer.from(userId) });
}
export function decryptModelKey(payload: string, userId: string) {
  try {
    return decryptPayload(payload, { key: encryptionKey(), associatedData: Buffer.from(userId) });
  } catch { throw new HTTPException(UNAVAILABLE, { message: MODEL_SETTINGS.unavailable }); }
}
