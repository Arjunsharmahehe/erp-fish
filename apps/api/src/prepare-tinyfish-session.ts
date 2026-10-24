import { TinyFish } from "@tiny-fish/sdk";
import { TinyProfileSchema } from "shared";
import type { BrowserAgentPort } from "./browser-agent-port";
import { readRemoteVaultItem } from "./remote-vault";
import { BrowserAgentError } from "./browser-agent-error";

const CONFIG_TIMEOUT = 30000;
const PROFILE = Object.freeze({
  url: "https://agent.tinyfish.ai/v1/profiles", header: "X-API-Key", json: "application/json", contentType: "Content-Type", method: "POST",
  name: "ERP Fish chat", timeout: CONFIG_TIMEOUT,
});
async function newProfile(apiKey: string) {
  try {
    const response = await fetch(PROFILE.url, { method: PROFILE.method, headers: { [PROFILE.header]: apiKey, [PROFILE.contentType]: PROFILE.json }, body: JSON.stringify({ name: PROFILE.name, set_as_default: false }), signal: AbortSignal.timeout(PROFILE.timeout) });
    if (!response.ok) throw new BrowserAgentError("service");
    return TinyProfileSchema.parse(await response.json()).id;
  } catch { throw new BrowserAgentError("service"); }
}
export async function prepareTinyfishSession({ client, apiKey }: { client: TinyFish; apiKey: string }, input: Parameters<BrowserAgentPort["prepare"]>[0]) {
  await readRemoteVaultItem(client, { erpUrl: input.erpUrl, credentialReference: input.authentication.credentialReference });
  const reusable = input.session?.credentialRevision === input.authentication.revision ? input.session : null;
  const profileId = reusable?.profileId ?? await newProfile(apiKey);
  return { profileId, credentialRevision: input.authentication.revision, credentialReference: input.authentication.credentialReference };
}
