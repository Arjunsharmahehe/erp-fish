import { AGENT, REMOTE_VAULT } from "shared";

const MESSAGES = Object.freeze({ login: AGENT.loginFailed, service: AGENT.unavailable, session: AGENT.sessionFailed, vault: REMOTE_VAULT.invalid });
export class BrowserAgentError extends Error {
  readonly kind: keyof typeof MESSAGES;
  constructor(kind: keyof typeof MESSAGES) { super(MESSAGES[kind]); this.name = "BrowserAgentError"; this.kind = kind; }
}
