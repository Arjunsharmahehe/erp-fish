# Generic ERP agent — phase 1

This replaces the fixed PO → SO → Stock chain in the original demo specification
for the live chat agent API. Remote sessions use TinyFish Vault. Legacy orchestrator
modules remain as fixtures; `create-job-router.ts` uses the generic executor.

## User flow

1. Save an ERP HTTPS URL in Settings. URLs may include an application path.
   Connect the ERP login in TinyFish Vault through 1Password or Bitwarden. The
   server owner assigns that credential to the registered ERP Fish account and
   exact ERP URL; Settings checks its availability and domain match.
2. Select Agent in the workspace. Describe the requested action and optionally
   attach a PDF, text, or JSON document. Document extraction does not require an
   invoice-specific schema. Scanned PDFs without a text layer need readable text.
3. Choose **Save as draft** or **Create and submit** before each request. Draft is
   the initial choice. The confirmation names the target ERP.
4. The browser agent discovers the site's navigation and forms. It performs only
   the requested task, searches for existing records before writes, and asks for
   missing or ambiguous data instead of inventing it.
5. Results, verified IDs, questions, answers, and browser run IDs stay with the
   chat. A question resumes the same task, submission policy, and browser profile.

Purchase Orders, Sales Orders, Stock Entries, and other records use the same
requested-task flow. There is no automatic sequence of related documents.

## Credentials and browser execution

- Remote requests use `use_profile: true`, `use_vault: true`, and exactly one
  `credential_item_ids` entry. TinyFish performs credential filling outside the
  model. ERP Fish does not decrypt local credentials or fill remote login forms.
- `TINYFISH_VAULT_BINDINGS` is a validated JSON array of `{user_id, erp_url,
  credential_item_id}` configured by the server owner. Assign only an approved,
  existing account's immutable UUID. Email is deliberately not an authorization
  key: signup does not verify ownership. No account-wide credential fallback or
  client-supplied item IDs are accepted.
- Before execution, the assigned item must exist in TinyFish Vault and match the
  ERP hostname (exact domain or its subdomain). Metadata from other items is never
  returned to the app user. The adapter passes the selected opaque reference as
  an API parameter, never in the goal or conversation.
- TinyFish's current API sources items from connected 1Password/Bitwarden vaults;
  it has no freeform username/password item creation endpoint. Setup happens in
  TinyFish's dashboard. Settings shows setup, readiness, and refresh controls.
- Per-chat profile IDs and authentication revisions remain persisted. Changing a
  credential assignment starts a fresh profile. MFA or inaccessible login flows
  must ask for user intervention rather than request passwords in chat.
- The existing `erp_credentials` AES-256-GCM store is retained for the future
  local adapter. Its key is optional for remote-only boot and required when that
  store is read or written. Keep an existing key with database backups. Remote
  execution never consumes the stored username/password; the local browser
  executor is not implemented or exposed in Settings yet.
- `BrowserAgentPort` separates session preparation, starting a run, and inspecting
  it from the orchestrator. A future local adapter can implement that port. No
  local-browser implementation or provider-choice UI is included in phase 1.

## Persistence and failures

`agent_runs` stores the owned chat, connected ERP, full request/document, approval
mode, remote run ID, verified results, question, and status. `agent_sessions`
stores the chat's browser profile and credential revision. `agent_attempts` keeps
each run ID when a questionnaire causes another browser attempt. The agent receives
recent conversation/task context plus scoped saved memories and current answers.

Only one active execution per user/ERP connection can write at a time. Planning
and chat deletion are blocked while that chat has active agent work. A server
restart can reconcile a persisted remote run ID without starting another run.
The provider's queue request has no automatic retries. A lost enqueue response,
unverified result, provider failure, or reported draft-policy violation is marked
uncertain. The UI requires the user to verify ERP records and confirm the remote
run has stopped before unlocking the chat; this does not retry the task. A known
run ID with an unverified result may be inspected again without enqueuing. Closure
is blocked during inspection, and stale inspection results cannot overwrite a
changed run. Blank/null optional questions normalize to absent; `needs_input`
still requires a nonempty question.

The draft policy is an instruction to the remote browser agent, with an additional
result check for reported submitted records. It is not a browser-level interception
of every possible ERP finalization action. Live draft verification is a release
gate, not something the result check alone proves.

Questions and assistant summaries remain English in storage. Existing client-side
translation displays them in English, Hindi, or Tamil. The agent decides whether
the latest answered question contains a reusable preference; memory edits/deletes
continue to take precedence.

## API

- `POST /api/jobs`: `{thread_id?, instruction, completion_mode: "draft"|"submit",
  document?: {name, text}, original?}` → accepted run view.
- `GET /api/jobs/:id` and `GET /api/chat/threads/:id/runs`: owned persisted state,
  reconciled with TinyFish while active.
- `POST /api/jobs/:id/answer`: `{answer, original?}` → resumed run.
- `POST /api/jobs/:id/resolve`: `{erp_checked: true, run_stopped: true}` → close an
  uncertain run without retrying.
- `POST /api/agent/document`: authenticated raw PDF/text/JSON extraction, 10 MB
  limit and a bounded extracted-text size.
- `GET /api/auth/settings`: includes account-scoped TinyFish Vault status.
- `PUT /api/auth/settings/credentials`: retained local encrypted-store boundary;
  `{username, password}`; DELETE clears it. Neither operation configures remote login.

All routes require the ERP Fish session and enforce user ownership. `/jobs/:id`
opens the corresponding chat. The old standalone `/parse` screen opens `/home`.

## Verification status

See `LOOP_LOG.md` for exact gates and live run IDs. A successful login/profile
save is separate from successful ERP creation. The main merge must wait for a
live create → real ID → repeat → same ID loop; provider rejection is not a pass.
