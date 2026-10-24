import type { Database } from "bun:sqlite";
import { TinyFish } from "@tiny-fish/sdk";
import { HTTPException } from "hono/http-exception";
import { REMOTE_VAULT, RemoteVaultItemsSchema } from "shared";
import type { UserRow } from "./users";
import { findUserById } from "./users";
import { env } from "./env";
import { BrowserAgentError } from "./browser-agent-error";

const CONFIG_TIMEOUT = 30000;
const CONFIG_UNAVAILABLE = 503;
const VAULT = Object.freeze({ timeout: CONFIG_TIMEOUT, status: CONFIG_UNAVAILABLE, noRetries: 0, trailingDot: /\.$/, scheme: "://", https: "https://", domainSeparator: "." });
export function remoteVaultBinding(user: Pick<UserRow, "id" | "erp_host">) {
  return env.TINYFISH_VAULT_BINDINGS.find((binding) => binding.user_id === user.id && binding.erp_url === user.erp_host);
}
export function remoteAuthentication(db: Database, scope: { userId: string; erpHost: string }) {
  const user = findUserById(db, scope.userId);
  const binding = user?.erp_host === scope.erpHost ? remoteVaultBinding(user) : undefined;
  if (!binding) throw new HTTPException(VAULT.status, { message: REMOTE_VAULT.missing });
  return { credentialReference: binding.credential_item_id, revision: REMOTE_VAULT.revisionPrefix + binding.credential_item_id };
}
function domainMatches(erpUrl: string, domain: string) {
  try {
    const allowed = new URL(domain.includes(VAULT.scheme) ? domain : VAULT.https + domain).hostname.toLowerCase().replace(VAULT.trailingDot, "");
    const host = new URL(erpUrl).hostname.toLowerCase().replace(VAULT.trailingDot, "");
    return host === allowed || host.endsWith(VAULT.domainSeparator + allowed);
  } catch { return false; }
}
export async function readRemoteVaultItem(client: TinyFish, input: { erpUrl: string; credentialReference: string }) {
  const response = RemoteVaultItemsSchema.parse(await client.vault.items.list());
  const item = response.items.find((candidate) => candidate.itemId === input.credentialReference);
  if (!item?.domains.some((domain) => domainMatches(input.erpUrl, domain))) throw new BrowserAgentError("vault");
  return item;
}
export async function checkRemoteVault(user: UserRow) {
  const binding = remoteVaultBinding(user);
  if (!binding || !user.erp_host) return { ready: false, label: null, message: REMOTE_VAULT.missing };
  if (!env.TINYFISH_API_KEY) return { ready: false, label: null, message: REMOTE_VAULT.unavailable };
  try {
    const client = new TinyFish({ apiKey: env.TINYFISH_API_KEY, maxRetries: VAULT.noRetries, timeout: VAULT.timeout });
    const item = await readRemoteVaultItem(client, { erpUrl: user.erp_host, credentialReference: binding.credential_item_id });
    return { ready: true, label: item.label, message: null };
  } catch (error) { return { ready: false, label: null, message: error instanceof BrowserAgentError ? error.message : REMOTE_VAULT.unavailable }; }
}
