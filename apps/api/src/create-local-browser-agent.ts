import type { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { BROWSER } from "shared";
import type { BrowserAgentPort } from "./browser-agent-port";
import { env } from "./env";
import { requireLocalBrowser } from "./browser-settings";
import { startLocalBrowser, inspectLocalBrowser } from "./local-browser-runtime";
import { localBrowserConfig as CONFIG } from "./local-browser-config";

export function localBrowserInstalled() { return existsSync(env.LOCAL_BROWSER_EXECUTABLE ?? chromium.executablePath()); }
export function createLocalBrowserAgent(db: Database, userId: string): BrowserAgentPort {
  return {
    prepare: ({ authentication, session }) => {
      requireLocalBrowser();
      if (!localBrowserInstalled()) throw new Error(BROWSER.missing);
      const profileId = session?.credentialRevision === authentication.revision ? session.profileId : crypto.randomUUID();
      if (!CONFIG.uuidPattern.test(profileId)) throw new Error(BROWSER.unavailable);
      return Promise.resolve({ profileId, credentialRevision: authentication.revision, credentialReference: authentication.credentialReference });
    },
    start: (input) => Promise.resolve(startLocalBrowser(db, { ...input, userId })),
    inspect: (runId) => Promise.resolve(inspectLocalBrowser(db, runId)),
  };
}
