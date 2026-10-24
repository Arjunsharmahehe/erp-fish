import { z } from "zod";
const MAX_CREDENTIAL_LENGTH = 4096;
const KEY_BYTES = 32;
const IV_BYTES = 12;
export const ERP_CREDENTIALS = Object.freeze({
  path: "/api/auth/settings/credentials", min: 1, max: MAX_CREDENTIAL_LENGTH, keyBytes: KEY_BYTES, ivBytes: IV_BYTES,
  invalid: "Could not decrypt the ERP credentials. Save them again in Settings.",
  missing: "Save your ERP credentials in Settings first.", keyError: "ERP_CREDENTIALS_KEY must be a base64-encoded 32-byte encryption key.",
  unavailable: "ERP_CREDENTIALS_KEY is required to store or read local ERP credentials.",
});
export const ErpCredentialsSchema = z.object({ username: z.string().trim().min(ERP_CREDENTIALS.min).max(ERP_CREDENTIALS.max), password: z.string().min(ERP_CREDENTIALS.min).max(ERP_CREDENTIALS.max) }).strict();
export const ErpCredentialRowSchema = z.object({ user_id: z.string(), erp_host: z.string(), encrypted_credentials: z.string(), revision: z.string() });
export type ErpCredentials = z.infer<typeof ErpCredentialsSchema>;
