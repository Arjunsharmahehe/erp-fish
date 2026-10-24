import type { AgentBrowserResult } from "shared";

export interface BrowserSessionContext { profileId: string; credentialRevision: string }
export interface BrowserAuthentication { credentialReference: string; revision: string }
export interface PreparedBrowserSession extends BrowserSessionContext { credentialReference: string }
export interface BrowserAgentPort {
  prepare: (input: { erpUrl: string; authentication: BrowserAuthentication; session: BrowserSessionContext | null }) => Promise<PreparedBrowserSession>;
  start: (input: { erpUrl: string; goal: string; session: PreparedBrowserSession }) => Promise<string>;
  inspect: (runId: string) => Promise<{ status: "running" } | { status: "completed"; result: AgentBrowserResult } | { status: "failed"; error: string }>;
}
