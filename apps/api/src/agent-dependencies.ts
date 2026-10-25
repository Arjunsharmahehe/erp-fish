import type { Database } from "bun:sqlite";
import { HTTPException } from "hono/http-exception";
import { AGENT, BROWSER, ERP_CREDENTIALS, MODEL_SETTINGS, AgentStatusSchema, type BrowserProvider } from "shared";
import type { UserRow } from "./users";
import { env } from "./env";
import { browserSettings, requireLocalBrowser } from "./browser-settings";
import { createRemoteBrowserAgent } from "./create-remote-browser-agent";
import { createLocalBrowserAgent, localBrowserInstalled } from "./create-local-browser-agent";
import { remoteAuthentication, checkRemoteVault } from "./remote-vault";
import { readCredentials, savedCredentials } from "./erp-credentials";
import { resolveModelConfig } from "./model-settings";

const UNAVAILABLE = 503;
function localMessage(db: Database, user: UserRow) {
  if (!env.ERP_CREDENTIALS_KEY) return ERP_CREDENTIALS.unavailable;
  if (!user.erp_host || !savedCredentials(db, { userId: user.id, erpHost: user.erp_host })) return ERP_CREDENTIALS.missing;
  if (!resolveModelConfig(db, user.id)) return MODEL_SETTINGS.missing;
  return localBrowserInstalled() ? null : BROWSER.missing;
}
export async function agentAvailability(db: Database, user: UserRow) {
  const provider = browserSettings(db, user.id).provider;
  const message = !user.erp_host ? AGENT.missingHost : provider === BROWSER.local ? localMessage(db, user) : !env.TINYFISH_API_KEY ? AGENT.missingProvider : (await checkRemoteVault(user)).message;
  return AgentStatusSchema.parse({ provider, ready: message === null, erp_host: user.erp_host, message });
}
export function agentDependencies(db: Database, { userId, provider }: { userId: string; provider: BrowserProvider }) {
  if (provider === BROWSER.local) {
    requireLocalBrowser();
    return { db, provider, port: createLocalBrowserAgent(db, userId), loadAuthentication: (scope: { userId: string; erpHost: string }) => {
      const saved = readCredentials(db, scope);
      return { credentialReference: scope.userId, revision: saved.revision };
    } };
  }
  if (!env.TINYFISH_API_KEY) throw new HTTPException(UNAVAILABLE, { message: AGENT.missingProvider });
  return { db, provider, port: createRemoteBrowserAgent(env.TINYFISH_API_KEY), loadAuthentication: (scope: { userId: string; erpHost: string }) => remoteAuthentication(db, scope) };
}
