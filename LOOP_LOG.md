# LOOP_LOG — erp-fish no-keys build loop

## Track 1 contract gaps
- Resolved in Track 3: onboarding consumes Track 2's bare `SessionUser`.
- Resolved in Track 3: auth/chat/thread boundaries now use shared schemas and
  the inferred Hono client. The temporary frontend schema bridge is removed.
- Thread detail currently returns messages without invoice context. The
  attached invoice is sent with the first chat request; a thread reopened after
  reload needs a reattachment unless Track 2 persists and returns that context.

## Track 3 amendments — 2026-10-24
- Integrated `origin/backend/plan-mode` at `e8f3153` into the frontend worktree.
  Local web :3002 now uses the real API :3001, replacing the preview API :3101.
  Local JWT secret is generated into ignored `apps/api/.env.local`.
- Added shared AuthResponseSchema for signup/login envelopes. Requests use
  Hono route inference, credentials included, and shared response validation.
- Invoice attachment supports PDF and JSON. Other files receive a clear
  unsupported-type message. Composer is compact with a plus attachment control
  and an embedded Planning/Agent Select, as requested.
- Keyless acceptance amendment: verify the backend's explicit degraded 200
  notice; invoice-specific model answers require configured model credentials.
  Do not substitute invented answers for a missing model. After keyless
  verification, user supplied credentials in the main checkout's ignored env.
  Copied only model/TinyFish settings into this worktree's ignored runtime env
  and restarted the API, preserving the JWT secret and current sessions.
- Legacy `/parse`, `/memory`, and `/jobs/[id]` remain the existing standalone
  demo screens. Their relocation stays with the deferred agent/memory phase;
  the plan-mode shell intentionally retains Memory/Settings placeholders.
- Landing follows the supplied structure with shared green light/dark tokens.
  A trusted static bootstrap sets the root theme before body paint, including
  Base UI portal content. TinyFish's original SVG is unchanged in both modes.
- Manual verification: real signup → host-only onboarding → home; JSON invoice
  parse; planning degraded response with a persisted thread; reload restores
  message history and dark preference. Agent selection remains an explicit
  coming-next state and can switch back to Planning.
- Backend suite: 26 passing. Initial sandbox run hit one 5s filesystem timeout;
  unchanged suite outside that sandbox passed in 2.10s, with no timeout changes.
- React Doctor: 13 pre-existing UI scaffold warnings, none in changed files.
- Final integration checks: `bun run check` passed; logout redirects guarded
  home to login, login restores the session; live model returned the frozen
  invoice number, quantities 10/5 and line totals 1500/1000 through the UI.
  Mobile sidebar and Select portals verified in dark mode. Astra reviews found
  no remaining regressions in changed scope.

> **Where things stand (2026-10-24):** all no-keys work is committed (8
> commits, `b0b11e0` → `9c3d706`). Open the **KEYED PHASE** list at the
> bottom for what remains. Per-ticket detail follows, newest first.
>
> **Loop conventions for future agents:** one ticket = one commit
> (`<nn>: <title>` + seam/tests/review outcome in the body); every ticket
> ends with typecheck + tests + react-doctor (web) + read-only sweep +
> Muse-family review, fixes applied, then commit; durable project-wide
> lessons go to AGENTS.md as a numbered rule, per-ticket notes go here.

## 07-minus-rehearsal (no live calls; rehearsal itself blocked on keys/tunnel)
- Routes: POST /api/jobs (201, zValidator), GET job (404), GET stream (SSE
  replay of tasks/questions/done), POST questions answer (400/404),
  GET memory, GET profiles/status (env presence only, no secret leak).
  Demo agent (DEMO_AGENT=true) serves canned IDs; "doubt" in instruction
  triggers needs_input. Live adapter + background + live SSE tailing deferred.
- Web: header VaultBadge, home links, parse page job start + redirect,
  /jobs/[id] (server initial + EventSource/poll/timer/answer form/time-saved
  vs 25-min baseline/learned count), /memory list + count.
- Reviews: sweep — shared SEPARATOR/SPACE/CONTENT_TYPE_HEADER hoists in,
  VAULT_CONNECTED compare, api README port, questions log label
  (2nd finding false positive: infra .env.example exists; root README refs
  verified); Muse — 2 blockers fixed (answer 400/404 mapping, URL derivation
  from API_PATHS), poll gating via useEffectEvent, doctor clean on new files.
- Web tsconfig lesson: explicit types:["bun",...] needed so bun:sqlite
  ambient types load through the api import graph (-> AGENTS.md? no — one-off
  tooling fix, not project law).
- Verified: all pages 200, job page server-renders all 3 IDs + timer +
  learned label; curl: POST/GET/stream/answer/memory/status + 404s;
  typecheck x3 green; 21 tests pass.
- Keys present in shell env (TINYFISH_API_KEY) were NEVER used — no live
  browser/LLM calls made in any ticket. Remaining for keyed phase: tunnel
  live + first-run seed, Profile/Vault proof, live adapter, rehearsal.

## 02-infra-only (no keys, no daemon on this box)
- Wrote: infra/erpnext/{README,.env.example,seed.env.example},
  infra/tunnel/{README,cloudflared.yml}, apps/api/scripts/seed-erpnext.ts
  (Frappe REST login + check-then-create Company/Supplier/Customer/Items/
  Warehouse, zod boundaries, typed SeedHttpError, fail-fast env),
  DEMO_CUSTOMER/COMPANY/ABBR/WAREHOUSE fixtures. Demo PDF already done in 03.
- Blocked here: docker daemon cannot run (no sudo, no rootless kit) so
  bring-up + seed are written+reviewed but NEVER executed — first-run
  verification pending on demo machine; TinyFish live proof needs keys.
- Reviews: Nemotron sweep — SPACE hoisted to shared (4th site); its 2nd
  finding (missing infra/erpnext/.env.example) is a FALSE POSITIVE, file
  exists with ERPNEXT_VERSION pin (dotfile missed by its listing). Muse
  APPROVE 0 blockers (2 infos + 2 lows, non-blocking).
- Tag verified live: frappe/erpnext v16.52.1 (amd64+arm64) via Hub API.

## 06: Ask-once Memory slice
- Seams: B+C — answerQuestion/listMemory/getLearnedContext + memory-hit retry in runChainStep.
- Red-green: 5 memory tests first (missing surface), green; review fixes kept green. 21 pass total.
- Reviews: Nemotron sweep (eventTypes helper for 4× events.map); Muse review
  2 blockers fixed (resume reuses paused task row via resumedTaskId — no more
  PAUSED+DONE duplicates; retry-doubt queues the latest question) + trim
  before store, mustId loud-fail wrapper, blank/double-answer tests, QA-carry
  assertion. Left: getJob corrupt-JSON info (writers always validate).
- Decisions: goal-aware stub branches only on goal content (faithful LLM-agent
  fake, no call-count logic); memory-hit retries once with explicit Q:A then
  queues; SO/Stock dedupe stays invoice-based (supplier party; customer mapping
  is a live-tuning concern for the keyed phase).
- Verified: resume completes chain reusing paused task, repeat job zero
  questions, host scoping, list/count, stale single-retry.

## 05: Sale Order plus Stock chain
- Seam: B — same createJob extended to PO→SO→STOCK via runChainStep+haltJob.
- Red-green: rewrote job tests for 3-step world (missing methods/events first),
  green; 14 pass total.
- Reviews: Nemotron sweep (unified 3 goal builders into buildGoal skeleton);
  Muse APPROVE 0 blockers, accepted 2 lows (CompletedOutputRowSchema rename,
  taskId in every event/log context) + noted getJob JSON.parse info (writers
  always schema-validate; left as-is).
- Decisions: prior IDs travel as explicit agent args (boundary-observable) AND
  in goal text; SO/Stock dedupe keyed (kind, invoice_no, supplier, erp_host) —
  supplier stands in for SO customer until 06 memory supplies mappings;
  routes+SSE stay deferred to 07-minus (no live adapter yet).
- Verified: full chain event order, retry reuses all 3 with 1 PO call,
  retry-after-SO-failure completes, prior IDs at stub boundary.

## 04: Purchase Order autopilot slice
- Seam: B (Job orchestrator) — createJob/getJob with stubbed AgentPort, real bun:sqlite :memory:.
- Red-green: 4 tests first (missing modules), green; review fixes kept green. 12 pass total.
- Reviews: Nemotron sweep — merged MIN constants already done in 03 follow-up;
  removed orphan exports (InvoiceJSON/ParseRequest types, QUEUED statuses);
  kept JobView/TaskView/QuestionView (live via getJob). Muse review 3 blockers
  fixed (PO task now FAILED/PAUSED on throw/doubt paths, agent error logged +
  carried on failed event, dropped `as unknown`); advisories accepted (STEP_*
  in tests, goal-clause assertion, per-row safeParse guard, single-insert
  reuse, log-in-emit with detail). Declined with reason: toView×4 (terminal
  branches, helper already the abstraction), "ok" consolidation (separate
  domains), toView throw (unreachable invariant), concurrency race (noted for
  05/06 — single-runner demo), q_norm/dedupe case (reconcile in 06).
- Deferred to 05: HTTP routes + SSE (no live adapter yet; 503-only route
  would be dead code — agreed by reviewer).
- Verified: typecheck x3 green; retry reuses PO-DEMO-0001 with 1 agent call;
  doubt → waiting + queued question; throw → failed.

## 03: Invoice parse slice
- Seam: A (Parse) — parseInvoice* via public interface, stubbed LLM, real unpdf.
- Red-green: 5 tests first (module missing), green; then 3 more tests for
  review findings (empty-text guard red, then green). 8 pass.
- What broke: TanStack AI skill examples target v0.42 `{role, content}`
  messages; installed v1.0.0 requires UIMessage `{id, role, parts:[{type,
  content}]}` — resolved against installed source per skill rule, not memory.
- Reviews: Nemotron sweep (merged 4× `1 as const` into shared
  MIN_TEXT_LENGTH); Muse review 1 blocker fixed (malformed JSON body now
  typed 400, not 500) + 4 suggestions accepted (blank-text guard before LLM
  call, input-capture assertion, extract/validation reason tests,
  logger.warn on needsFix); 1 declined (safeParse in page — parse() throw
  is an Error already caught and displayed).
- Verified: route paste-valid ok, garbage validation_failed, empty
  empty_request, malformed 400, PDF-without-keys 503 naming missing config;
  web /parse renders 200, react-doctor clean on new files; typecheck x3 green.
- Reused later: DEMO_INVOICE fixture + demo-invoice.pdf + generator script
  feed tickets 04-06 and 02-infra.

## 01: CLI monorepo scaffold
- Seam: none (infra, manual verification only — no red-green per specs/04).
- What broke: (1) `shared`/`api` workspace deps resolved to same-named
  registry packages — workspace `shared` had no version so `^0.2.0` missed
  it; `bun add api` fetched registry until `@workspace` protocol used.
  (2) `hc<AppType>` typed the client `unknown` — routes were registered via
  split statements, so `AppType` carried `BlankSchema`.
- Lesson: Hono routes must chain on one instance or `AppType` loses the
  schema (-> AGENTS.md §16). Workspace adds need explicit versions +
  `@workspace` protocol.
- Review: Nemotron sweep 2 trivial (removed unused `HelloResponse`,
  `ROOT_MODULE`); Muse review 2 blockers fixed (no bare catch — page throws
  typed error on `!res.ok`; named constant for env `min(1)`); 1 suggestion
  declined with reason (keep pre-approved scaffold deps `@tiny-fish/sdk`,
  `unpdf`, `@tanstack/ai*` for tickets 03-05 to avoid reinstall churn).
- Verified: api `:3001/api/hello` 200 schema JSON; web `:3000` renders API
  message via `hc` + shared-schema parse; `bun run typecheck` green x3;
  react-doctor 13 warnings all pre-existing `ui/` scaffold.

## KEYED PHASE (blocked on API keys + live Docker daemon + tunnel)
1. Boot ERPNext: `docker compose up` per `infra/erpnext/README.md`, create the
   site, run `apps/api/scripts/seed-erpnext.ts`, confirm masters load.
2. Freeze the tunnel per `infra/tunnel/README.md`; set `ERP_BASE_URL`.
3. TinyFish live proof (ticket 02): Profile setup-session + Vault link, one
   manual Agent PO create returning a real order ID.
4. Real TinyFish adapter (`AgentPort` impl in `apps/api/src/`, using
   `@tiny-fish/sdk` already installed): replace `createDemoAgent` wiring in
   `POST /api/jobs` + answer route (keep `DEMO_AGENT=false` default; delete
   the demo path once live is proven, not before).
5. Background job execution + live SSE tailing (current `/stream` only
   replays persisted history).
6. Full single-invoice rehearsal (ticket 07): upload → parse → autopilot →
   Q&A if asked → verify PO/SO/Stock IDs in ERPNext, no mid-demo code edits.
7. Docs notes to re-check live: SO/Stock dedupe is keyed by supplier party
   (customer mapping may need Memory/goal tuning), warehouse answer
   (`Main Warehouse` vs ERPNext's `Main Warehouse - DFC`), 25-min manual
   baseline is a rough estimate.

## TS 6.0.3 downgrade plus lint cleanup (2026-10-24, uncommitted)
- Downgraded `typescript` ^7 → ^6.0.3 (web devDep, root + shared peerDeps) via
  `bun add`; typescript-eslint 8.72 runs again. `bun run check` green
  (typecheck x3, eslint root/api/web/shared), 21 api tests green,
  react-doctor clean on new files.
- Fixed 2 latent config bugs the TS7 crash had hidden: type-aware sets now
  scoped to TS files (`scopedTo` in eslint.base.mjs) + web filters the
  duplicate tseslint base block Next already provides (TSESLINT_BASE_BLOCK).
- api: orchestrator.ts split into events/goals/types/invoke/run-chain-step/
  create-step-defs/chain/queries/jobs + facade; db.ts split rows.ts;
  llm.ts renamed create-invoice-llm.ts; options-object params; 4 targeted
  disables (2 boundary-unknown, bun rejects-typing x2 with probe evidence).
  One test-behavior note: `await expect().rejects.toThrow()` kept as-is;
  bun tracks un-awaited rejects correctly but awaiting matches the proven suite.
- web: parse page split (lib/parse-requests + use-parse-page + panels);
  job view split (lib/job-api + use-job-view + sections + panel, file
  renamed job-view-panel.tsx); route exports renamed Page; next.config.ts
  disable (framework-fixed filename); 2 mountedRef/set-state disables
  documented as rule false positives.
- TEMPORARY: web config ignores src/components/ui/** + 3 unused scaffold
  files (hooks/use-mobile, hooks/use-highlighted-code, lib/highlighter).
  Remove once the UI scaffold phase (user-approved next step) is done.
- Review: Muse review found no behavior drift; review fixes applied
  (re-await rejects, full row-type re-exports, stale facade comment).

## App UI + chat MVP plan (2026-10-24, uncommitted plan)
- User direction: `/` stays a static landing placeholder (designed later);
  hand-rolled JWT now (better-auth later); onboarding captures ERP host +
  credentials (passwords never persisted, Vault-forwarded when keyed);
  main app under `/home` with sidebar (Chat, Memory, Settings, jobs);
  memory page gets edit/delete; settings edits host/endpoint; main chat
  interface with planning mode (invoice-aware Q&A + TinyFish search/fetch,
  gated on keys) and agent mode (creates job via existing orchestrator).
  Agentic browser surface is the next phase after this MVP.
- Wrote specs/05-app-ui-chat-mvp.md (route map, auth design, shell, chat,
  memory/settings API, shared schemas, DB migrations, env, build order)
  + tickets 08-auth-onboarding, 09-app-shell-sidebar, 10-chat-planning-mode
  (proposes seam D mirroring A, confirm before testing), 11-memory-settings.
  Tickets 01-07 untouched (historical demo slices).
- Key decisions: zero new deps (Bun.password + hono/jwt); cookie session
  `erp_fish_session` + CORS credentials; middleware verifies via
  GET /api/auth/me (no secret sharing); server fills erp_host/profile_id
  from session on job create; jobs.user_id scoping with 404 (no leak);
  chat composition per shadcn rules/chat.md (MessageScroller/Message/
  Bubble/Attachment/Marker), Questionnaire for onboarding, ToggleGroup for
  modes; no chat streaming in MVP (JSON req/res).
- Open questions for user: (1) chat threads client-side vs server
  persistence for MVP; (2) delete old top-level routes immediately vs keep
  during transition; (3) landing placeholder content level.

## Plan-mode parallel tracks (2026-10-24, uncommitted plan)
- Split plan-mode MVP into 3 track docs under .scratch/erp-fish/tracks/:
  track-1 (frontend: auth pages, onboarding wizard, landing placeholder,
  /home shell + sidebar, planning chat UI; owns apps/web only),
  track-2 (backend: JWT auth, onboarding, chat + threads API, seam D;
  owns apps/api + packages/shared), track-3 (reconciliation: merge
  backend-first, rebase frontend, single-stack e2e, tag plan-mode-e2e).
- Out of plan-mode scope: agent execution UI, jobs scoping, memory CRUD,
  settings forms, landing design, chat streaming.
- Frozen contract shared by both lanes (auth 5 routes + chat 3 routes,
  cookie session, keyless-degraded 200s). Ownership rule: only track 2
  edits shared/; gaps logged in LOOP_LOG for track 3.
- Ports: backend lane defaults (:3000/:3001); frontend lane worktree
  ../erp-fish-frontend on frontend/plan-mode (api :3101, web :3002).

## Track 2 backend plan-mode done (2026-10-24, on backend/plan-mode, unpushed)
- Built all 8 routes per frozen contract: auth ×4, onboarding, chat ×3.
  `bun run check` green (typecheck ×3, eslint ×4), `bun test` 26 pass
  (21 existing + 5 seam-D). Manual curl loop green: signup 201 →
  me → duplicate 409 → bad-login 401 → onboard host-only → keyless
  degraded chat 200 + thread_id → continue thread → list/detail →
  2nd-user foreign-thread 404 → unauth chat 401 → logout → me 401 →
  login restores → tampered cookie 401. Passwords stored argon2-hashed,
  fail-fast boot crash names JWT_SECRET, CORS credentials on.
- Seam D confirmed by lane prompt (red-green with stubbed chat LLM first,
  mirroring seam A); tests assert frozen literals only.
- Structure: shared split into base/auth/chat barrel (max-file-length);
  api split db into users/threads, index routes into create-auth-router/
  create-chat-router via `.route()` (AppType preserved, hc probe OK).
- Review fixes applied (Muse-family general subagent): title from first
  USER-role message; cumulative-send contract (server diffs by stored
  user count, client assistant msgs never stored) — track-2 doc updated,
  Track 1 must send full history; seam-D test asserts frozen "fetch_url"/
  "web_search" literals; ZodError from live LLM → typed 502; narrowed
  tryCreateChatLlm catch to missing-config only; onboarding creds
  accept-but-ignore commented (keyed Vault phase forwards, never SQLite).
- Deferred (explicitly out of scope, not bugs): email normalization,
  login dummy-verify (timing), thread-ownership dedupe on 3rd use.
  Vault shows connected here because the shell env has TINYFISH_API_KEY;
  keyless CI/dev without it degrades per contract.

## Plan-mode TinyFish tools wired (2026-10-24, on backend/plan-mode, unpushed)
- New apps/api/src/create-planning-tools.ts: web_search + fetch_url as
  @tanstack/ai server tools (.server(execute)) backed by TinyFish SDK
  search.query / fetch.getContents (zero new deps). Bounded outputs:
  5 results, 500-char snippets, 8000-char markdown, purpose capped at
  the SDK 2000-char limit. Fetch failures throw fetch_failed, which the
  framework feeds back as output-error (model retries/answers anyway).
- create-chat-llm.ts passes tools into chat() with outputSchema:
  agentic structured output (run tools, then validated ChatResult).
  Empty tools without keys = direct answer; prompt instructs tool use +
  URL citations, names interpolated from constants.
- Live-verified with the provided testing key (not stored anywhere):
  search 10 hits -> 5 kept, fetch markdown 8000 chars, bad URL throws
  fetch_failed, keyed route without LLM still degraded 200 (no crash).
- Review fixes: fetch purpose forwarded (was dropped), markdown format
  + tool names + caps as named constants, fetch-fail warn logs URL.
  Declined: threading toolsAvailable (ambient env singleton is airtight),
  tool unit tests (no confirmed seam; live-verified instead), threadId
  in tool logs (port surface stays minimal).
- Full agentic loop (model calling tools) still needs OPENAI_BASE_URL /
  OPENAI_API_KEY / OPENAI_MODEL — no LLM key in this environment, so
  that last mile is unverified until keys land.

## Plan-mode live agentic loop via OpenCode Go (2026-10-24, backend/plan-mode)
- Go endpoint (from docs): https://opencode.ai/inference/go/openai/v1/chat/
  completions, model deepseek-v4.1-flash, key from user in gitignored
  apps/api/.env.local (not committed). Free-tier console endpoint refused
  (FreeTierError: usable only inside OpenCode; paid console has no funds).
- Fixes to make the loop run: x-opencode-session header per thread
  (Go 400s without it; thread UUID doubles as the session id),
  User-Agent erp-fish-plan-mode, json_object modelOptions (this endpoint
  rejects strict json_schema), system prompt via systemPrompts (in-messages
  system entry is not honored on this path — wire capture proved it was
  dropped), prompt demands JSON-only reply (gateway requires the word json).
- Verified live: GST question over demo invoice -> 5 TinyFish tool calls,
  answer cites invoice values + real URLs (cbic-gst.gov.in, indiafilings);
  thread persists with live answer. Live text parse also fixed by the same
  systemPrompts migration (create-invoice-llm.ts) and verified.
- Review (Muse-family subagent): no blockers; nits applied. Declined:
  threading toolsAvailable structurally (ambient env is airtight), unit
  coverage of tool wiring (no confirmed seam; live-verified instead).

## Backend agent-mode slices 1-2 (2026-10-24, backend/agent-mode, uncommitted)
- Adapter: `apps/api/src/tinyfish-result.ts` (pure PO mapper COMPLETED/
  FAILED/CANCELLED -> ok/needs_input/throws, 6 tests) + `create-tinyfish-
  agent.ts` (queue+poll, effective profile, SO/Stock throw not-enabled).
  Mapper split into env-free module so `bun test` stays green without
  JWT_SECRET (seam tests never import env-gated modules).
- Wiring (`index.ts`): auth on jobs + answer routes, session host/profile
  win with client fallback (contract unchanged), resolveJobAgent
  (key+profile -> real else demo/503), persistPoRunId via new
  updateTaskRunId (no-op until a real run exists).
- Manual: 401 without cookie; demo job done; server-fill proven (client
  host ignored when onboarded); doubt->waiting; answer resumes.
- Live attempts (testing key): output_schema must drop
  additionalProperties (allowlist); max_steps is beta-gated (duration cap
  only); bad profile fails fast at queue with typed error, no run made.
- Follow-ups: slice 3 needs real profile + ERP (Docker daemon blocked);
  restrict real-agent trigger to stored-profile-only later.

## Backend agent-mode review fixes (2026-10-24, backend/agent-mode, uncommitted)
- Muse-family review verdict was do-not-land-as-is (4 blockers); all fixed:
  B1 spend gate (real agent only on STORED session host+profile via
  allowReal; verified: key present + client profile -> demo, no spend),
  B2 contract note (401 on jobs/answers is per spec 05; reads stay open,
  ownership rides with deferred user_id scoping),
  B3 poll resilience (transport errors retry to deadline; auth/bad-request
  fail fast; error category propagated into the reason),
  B4 blank stored host/profile map to null (no 500 on row contract).
- Nits fixed: drainRunIds callability guard, persist never fails the
  request (warn+continue), distinct unexpected-status error, tests use
  RunStatus + precedence/empty-detail/non-terminal cases, max-poll cap
  alongside the deadline, queue errors normalized to agent_queue_failed.
  Extracted job-agent.ts (route cluster) and split queue/poll/finish
  helpers to satisfy max-params/complexity/file-length rules.
- Re-verified: check green, 35 tests green, curl loop green (401, demo
  done, server-fill, doubt->waiting->answer->re-pause per demo semantics).

## Agent guidance + site profiles (2026-10-24, backend/agent-mode, uncommitted)
- Gates doc updated (AGENTS.md rule 8): agent-path changes need the live
  mock-ERP loop green (PO check-then-create + dedupe re-run) with run IDs
  in LOOP_LOG before merge.
- Generic-ERP answer: goals are task semantics; grounding is a per-connection
  SiteProfile (entry URLs + hints). New `site.ts` (pure): Frappe defaults,
  demo buying/selling/stock paths + sign-in hints; `resolveSiteProfile`.
  Threaded as optional OrchestratorDeps.site (Frappe default; seam-B suite
  untouched). Adapter takes site + nullable profile (profile-less runs sign
  in via hints); MOCK_ERP_URL env; allowReal = stored host AND (stored
  profile OR mock host) — clients can never buy spend on arbitrary hosts.
- Guidance preamble in every goal (login/session, scope, masters rule,
  exact numbers, dropdown waits, JSON-only finish). No test asserts wording.
- Live: full-stack PO returns a REAL mock ID (run 8e2b209c proved
  queue->COMPLETED; unaligned seeds correctly rejected as invalid, not
  hallucinated). Dedupe leg blocked: mock is localStorage-only, so a saved
  Browser Context Profile for the mock host is mandatory (manual user step).

## Site-profile review fixes (2026-10-24, backend/agent-mode, uncommitted)
- Second review (3 blockers) all fixed: B1 host normalization via
  canonicalHost in site.ts (trailing-slash mock host now matches;
  regression test added), B2 answer-route affinity (session host must
  equal job host, normalized; job-row profile skew noted as follow-up
  for the settings slice), B3 trim() on mapper schemas (whitespace-only
  id/question now invalid, not DONE with garbage).
- Nits fixed: EMPTY_HINTS const, mockHost() single source, env indent,
  chain fallback extracted to jobSite helper, guidance blocked-clause
  names the {"question"} JSON shape.
- No live re-run: wire shape unchanged since the green provisioning run
  (canonicalHost/trim/affinity are no-ops for the slash-less same-host
  mock flow). Dedupe leg still waits on the manual mock-host profile.

## Generic ERP agent phase 1 (2026-10-25, main integration pending)
- Supersedes the live fixed PO/SO/Stock chain and external Vault dependency.
  The live API now takes the user's instruction plus optional PDF/text/JSON
  context and an explicit draft/submit policy. TinyFish discovers navigation;
  it receives no hardcoded ERP product paths or login credentials.
- Added encrypted per-user ERP credentials (AES-256-GCM; required stable
  ERP_CREDENTIALS_KEY), direct same-origin browser login, and a BrowserAgentPort
  boundary for future local execution. Local browser execution is not implemented.
- Persisted chat-scoped browser profiles, requests/documents, confirmed records,
  questions/answers, and all remote attempt IDs. A connection-wide lock prevents
  concurrent writes. Queue requests never auto-retry; uncertain runs need explicit
  user ERP review before the chat is unlocked. Memory remains agent-selected.
- Added Settings login fields, per-request draft/submit confirmation, TinyFish
  activity, questionnaire continuation, recovery confirmation, and Hindi/Tamil
  UI copy. Existing /jobs/:id links open the owned chat. /parse opens /home.
- API manual checks: auth required, signup/onboarding, encrypted credential storage,
  no credential values in Settings responses, generic text attachment extraction,
  mandatory completion mode, cross-account run denial, and credentials cleared
  when ERP URL changes. All passed. ERP URLs now preserve application subpaths.
- Gates: bun run check green (typecheck + lint); bun test 48 pass / 0 fail.
  React Doctor changed scope: 100/100, no issues. Full scan: 15 existing warnings
  in unchanged UI scaffold/language-select/use-voice-input, none in the new flow.
  The language-select cancellation reset is intentional; dictation has no cached
  server resource to invalidate. Existing scaffold findings remain deferred as
  previously tracked, with no lint or React Doctor configuration loosened.
- Astra review (per user model override) completed; stale-navigation, enqueue
  polling, and application-path trailing-slash findings fixed. Root ERP URLs
  normalize to their origin; /app/ and /app remain distinct as required by the
  portal. Manual URL normalization checks passed.
- Live signup -> onboard demo host -> save login -> prepare profile succeeded.
  Initial local validation falsely rejected TinyFish's parent-domain capture;
  corrected to accept the captured registrable domain. Failed preflight jobs:
  4af38702-fcd2-4c5c-8809-b9640f916e36 and
  11313417-f17b-4faa-b225-f82f9c63664a (no agent run started).
- Actual live task: job bd4e89b2-b7cf-4dfc-831f-802f382f04ef,
  chat 19a771a4-d6ca-4f92-a688-721989975464,
  TinyFish run 24532d0f-1751-45c5-8822-36c1ee281440.
  TinyFish returned FAILED / AGENT_FAILURE: request may violate usage policies.
  No verified ERP result or real record ID was returned. No automatic retry,
  no dedupe leg, and no Sales Order/Stock Entry execution claimed as verified.
  User was asked to inspect the provider run; live gate remains BLOCKED.
- Browser UI verification also pending: existing Codex tab was a browser error
  page and browser security denied reading it. User was asked to reload the app.
- Merge from origin/backend/agent-mode is prepared on main but NOT committed:
  AGENTS.md requires the live mock-ERP create/dedupe loop green before merge.
  See specs/06-generic-agent-phase1.md for the current contract and limitations.

## TinyFish Vault remote login + quotation recovery (2026-10-25)
- Supersedes the custom remote login flow above, per user direction. Remote
  sessions now use TinyFish Vault with one explicit credential item per approved
  account UUID and exact ERP URL. Item metadata and ERP domain are checked before
  queueing; no account-wide credential fallback or plaintext login in the goal.
  The encrypted local store remains reserved for a future local browser adapter.
- Added validated TINYFISH_VAULT_BINDINGS configuration and Vault readiness in
  Settings. Removed direct Playwright login and its dependency. Chat profiles and
  authentication revisions remain persisted; a changed assignment creates a new
  profile. TinyFish currently requires a connected 1Password/Bitwarden vault.
- The user-authorized API-only quotation test actually completed in TinyFish:
  job 7ca83ef4-7fd9-4fa8-989d-6c629f93d2f7,
  chat ce5f1178-bd56-4e93-842c-0a3b349e1364,
  run b4b07048-620b-4400-890c-3836147f9ee3.
  The provider reported draft PO-2026-00002 at
  https://demo-erp.fukumean.me/buying/purchase-order/PO-2026-00002.
  This run used the earlier session flow, not the new Vault path. Its saved goal
  contained neither the demo username nor password. No independent ERP UI
  verification or duplicate-check run is claimed.
- The app had rejected that result because the optional question was empty.
  Normalized blank/null optional questions and reconciled the same saved run
  without enqueueing again. The chat now records Done with the draft ID.
  needs_input still requires a nonempty question. Added seam-B coverage for
  reinspection, no second enqueue, and blocking closure during inspection.
- Astra review completed with no remaining actionable findings after fixing
  account assignment identity and stale-inspection races. API suite: 49 passed,
  0 failed, 157 assertions. Final bun run check passed (typecheck and lint in all
  workspaces). React Doctor changed scope: 100/100, 23 files, no
  issues. Restored ignored web env configuration; localhost:3002 returns HTTP 200.
- Live Vault verification is BLOCKED on account setup: the configured TinyFish
  account returned zero Vault connections and zero items. Asked the user to connect
  the demo login and supply its item ID and ERP Fish account to assign. No secret
  values requested in chat. The live create/dedupe gate and merge remain pending.

## Connected Vault verification and workspace corrections (2026-10-25)
- Supersedes the account-setup blocker above: Bitwarden connection succeeded and
  the approved Vault item is assigned to the existing test account and the user's
  newly registered account by UUID and exact saved ERP URL. Normal account Vault
  readiness was verified. No credential values are recorded here.
- Fixed the ignored local CORS origin to match the web server on localhost:3002.
  Login preflight returns 204 with the matching origin and credentials allowed.
  The earlier failed signup had not created an account; signup subsequently worked.
- Vault-backed API-only draft test completed:
  job 0ed6de3b-09e5-448b-9584-8c2df73f828d,
  chat 7d3e6c76-2c6f-4adb-b842-46f018503034,
  TinyFish run 91b1d9b1-a6ca-4f2d-85af-49a2dd545d95,
  draft PO-2026-00003. It used a fresh profile, use_vault=true, and the assigned
  credential item. This is a successful creation, not a successful dedupe check.
- Separately authorized read-only comparison run
  57b568d4-1ec2-45f0-a2e6-4b3d01423b0e confirmed PO-2026-00003 duplicates
  PO-2026-00002. Both remain drafts and neither stores the source reference.
  That diagnostic used the browser port directly; it was not a POST /api/jobs
  replay. No records were changed by the comparison. Duplicate deletion awaits
  explicit user approval; no deletion or submission is claimed.
- The comparison provider result exposed an empty optional memory object.
  Added seam-B regression coverage (observed red, then green) and normalized only
  fully empty memory metadata to null. API suite: 49 passed, 0 failed, 157 assertions.
- Strengthened generic duplicate guidance to open and compare candidate details,
  verify prior confirmed chat records, and pause on ambiguity when source references
  are absent. This remains prompt guidance and is not claimed to prevent duplicates
  until live verification succeeds. The create/dedupe gate and merge remain pending.
- Settings now displays the authenticated account email with loading/error states
  and English/Hindi/Tamil labels. Removed the ERP portal marker from the agent chat
  header. The ERP address remains available in Settings and the task confirmation.
  Astra reviewed the UI and backend correction with no actionable findings.
  React Doctor changed scope: 24 files, 100/100, no issues.
  Final bun run check passed (typechecks and lint in all workspaces).

## Sent attachments and visible completion choice (2026-10-25)
- New planning and agent messages persist attachment names in the existing chat
  details table. History renders a shadcn Attachment above the user's prompt.
  Accepted requests consume the composer attachment; planning keeps its invoice
  context for follow-up questions. Preaccept failures preserve the draft and file.
- Agent confirmation now uses full-width choices with a checkmark and a semantic
  primary selected surface, explanatory text, and a start button naming draft or
  submit. Draft remains the default. The vertical toggle forwards orientation to
  Base UI for keyboard navigation; English/Hindi/Tamil action labels are provided.
- Manual isolated checks passed: planning and agent attachment metadata survives
  history reload, Unicode filenames work, assistant citations remain intact,
  rejected streams do not consume the composer, and accepted streams acknowledge
  once. Both completion selections render exactly one pressed option.
- Astra review findings on preaccept failure handling and vertical keyboard
  navigation were fixed; final review found no concrete regressions. Existing API
  suite: 49 passed, 0 failed. React Doctor: 100/100, no issues.
  Final bun run check passed across all workspaces (typecheck and lint).
- Restarted the API after verifying no active agent runs. No ERP writes were
  performed for this UI verification. The integration merge remains pending the
  separately documented live duplicate-prevention gate.

## Clickable browser-agent blocker questions (2026-10-25)
- Confirmed the reported blocker stored its three answers inside the question
  text, with an empty choices array. Added choices to the provider output contract,
  persisted them with learning questions, and exposed them in waiting run views.
- Agent blockers now use shadcn Questionnaire radio choices, number shortcuts, a
  custom answer, dictation, and an explicit Continue agent button. No answer is
  preselected. English/Hindi/Tamil display preserves canonical English choice
  values; custom answers use the existing translation flow.
- Legacy numbered choices are recovered only with explicit choice intent.
  Numbered requests for multiple details remain free text. Added seam-B red/green
  coverage for persistence/resume, legacy choices, and required-detail lists.
  API suite: 51 passed, 0 failed, 165 assertions.
- Astra review finding on numbered requirements was fixed; final review found no
  remaining actionable issues, including the provider output schema. Manual
  server-rendered markup checks confirmed three radio inputs, no default choice,
  custom input, Continue agent, and number shortcuts. The actual saved blocker
  normalized to three choices without modifying the user's completed run.
- Restarted the API with the questionnaire change after confirming no active runs.
- Final `bun run check` passed in all workspaces. React Doctor's changed scope
  scanned 27 files: 100/100, no issues. Its full-project scan returned 78/100 with
  15 pre-existing warnings in unchanged files. Reviewed the cancellation path
  (the asynchronous path resets in finally), voice mutation (no cached resource
  to invalidate), and ToastClose (aria-label is passed through Base UI). Remaining
  warnings concern existing scaffold exports, semantic-role preferences, and
  stateless text-list index keys. No lint configuration or diagnostics were hidden.

## Final API replay verification and main integration (2026-10-25)
- Supersedes the pending live-replay gate above. The original approved PDF test
  created draft PO-2026-00002 in TinyFish run
  b4b07048-620b-4400-890c-3836147f9ee3. The later Vault test created duplicate
  PO-2026-00003; that incident and its comparison remain recorded above.
- Replayed the original stored request/document through POST /api/jobs in the
  existing isolated test account and chat 7d3e6c76-2c6f-4adb-b842-46f018503034.
  Draft-only policy and scoped TinyFish Vault authentication remained enabled.
  Job a754c65b-a662-4644-a001-d54ab3f3f0cd, TinyFish run
  451ae005-8c32-4864-9f94-9452dda7f713 completed with PO-2026-00002, state existing.
  The provider reported that no new record was created.
- Repeated once to confirm stable selection amid the previously duplicated drafts:
  job ff66131d-a3a3-4b27-be25-96d81e3934dd, TinyFish run
  7731dd06-9f9e-4f72-9d6b-ad1b65d25a60 completed with the same PO-2026-00002,
  state existing. Both successful API replays returned the original real ID.
  These verify this fixture; they do not guarantee behavior for every ERP.
- No ERP records were submitted or deleted by these checks. The duplicate
  PO-2026-00003 remains pending explicit cleanup approval. The user's separate
  completed jobs were not replayed or modified.
- Final gates: bun run check green; 51 API tests, 0 failures; React Doctor changed
  scope 100/100 with the full-project warning assessment above. Landing/workspace
  return HTTP 200 on localhost:3002; the API is running on localhost:3001.
- Integration is organized into five commits: backend/frontend merge, sent
  attachment presentation, visible completion choices, blocker questionnaire,
  and verification documentation. Local secret env files and databases are excluded.

## Local Chromium agent and Windows Docker deployment (2026-10-25)
- Implemented on feature/local-browser. ERP_FISH_MODE controls deployment policy:
  local permits per-account Chromium selection and defaults to it without a
  TinyFish key; production always uses TinyFish and rejects local browser APIs.
  NODE_ENV retains standard Next.js meanings. Remote authentication remains
  TinyFish Vault; local credentials are injected by a secure browser action.
- Generic DOM tools run through the account's compatible model, with no fixed
  ERP selectors or doctype paths. Provider, attempts, result and per-chat profile
  are persisted. Session cookies are encrypted and scoped to account/ERP/profile;
  ERP cookie paths are retained. Navigation stays within the connected origin.
  Draft finalization controls and implicit Enter submission are blocked. Unknown
  action failures stop for review rather than retry a possible write.
- Added translated local settings/login forms, a live authenticated read-only
  browser viewer and Stop control. Local status uses login wording, remote status
  retains Vault wording. API error logging omits provider payloads and secrets.
- Added non-root API/Chromium/Xvfb and standalone Next Docker images, a persistent
  data volume, loopback ports, health checks, Chromium seccomp profile, stable
  secret generation, and Windows setup documentation. Internal web authentication
  uses the Compose API hostname instead of the browser's public localhost URL.
- Containerized live seam-B loop: signup, onboard isolated mock ERP, save local
  credentials and personal model, POST /api/jobs with the frozen DEMO_INVOICE.
  Job 426b8b48-4250-42da-93b7-1ada4eb577e3, local run
  509aeb7d-60bc-48a1-8ef8-1696bfac5225 created draft PO-DEMO-0001.
  Replay job 21771abd-37b1-415c-9830-f507e69b8ce3, local run
  c97c0413-20ad-45ed-aec1-5bd364460641 returned the same ID, state existing.
  Mock counters: one login across both runs, three searches, exactly one draft
  POST, zero submissions. Both runs served owned JPEG viewer frames with no-store.
  No real ERP records were changed by this feature's verification.
- Manual production boundary checks passed: local preference cannot select local
  in production; local settings mutation, credential mutation, viewer and Stop
  return 403; absent TinyFish returns unavailable; private HTTP ERP/model URLs
  are rejected. Completed local history remains readable without a live provider.
- Browser safety checks passed for draft Enter/submit-value blocking, overlapping
  secret redaction, redaction before truncation and origin restrictions. Cookie
  checks confirmed path persistence, third-party exclusion and wrong-owner/ERP
  decryption rejection. Astra review findings were fixed; final review found no
  concrete blockers. All checks used isolated accounts and fixture data.
- Recreated both containers with final images. Account authentication, encrypted
  model/login settings, completed history and browser login survived. Viewer UI
  displayed a live frame; unauthenticated access returned 401 and another account
  received 404. Stop on read-only job 95e22d63-a3cf-4f08-b2c6-d732c5848989,
  local run f671985a-4bca-4558-96b5-4bd8a04ab788 closed Chromium, returned uncertain
  for review, and removed the live frame. Settings and viewer rendered without
  browser errors. Local selection is forced visibly when TinyFish is absent.
- Final gates: bun run check green; 53 API tests, 0 failures, 169 assertions;
  React Doctor changed scope 100/100, no issues. Full-project baseline warnings
  remain as documented above. Docker API and web images built successfully and
  both services passed health checks. Verification stack uses ports 3016/3017;
  the existing development API was restarted after confirming no active runs.
  Implementation branch: feature/local-browser. No merge to main.

## Local browser clarification-first correction (2026-10-25)
- Investigated user job f891888b-ddbe-4546-81df-f2f127880127, browser run
  0c297c86-3bcb-49c6-b60a-d631e6720f48. Sanitized logs showed more than 50 browser
  actions followed by an uncertain result, without a questionnaire. The user's
  run was not replayed and its ERP records were not modified during diagnosis.
- Updated the local system/tool prompt: missing/conflicting facts require an
  early needs_input result; a saved record is not required before asking.
  Clarification is conditional on a real blocker, so clear and resumed requests
  proceed. Limit each ambiguous fact to two focused read-only lookups; stop on
  repeated screens/errors; do not switch document types or create master data to
  work around a blocker. Questions use the existing choices/custom-answer flow.
  These are model instructions, not a deterministic loop detector.
- Added the reusable manual seam-B harness
  apps/api/scripts/local-browser-blocker-loop.ts and README instructions. The
  frozen invoice lacks a required delivery warehouse; the fixture exposes two
  valid choices and an unrelated Sales Order form. Initial-attempt browser action
  counts come from scoped Docker job/run logs, including reads and repeated clicks.
- Live Docker harness passed: job 85a6572d-0792-488e-86f1-d3e8941926df, question
  run 0abaa20a-0eea-441f-a1e7-9b3ff760db5a paused after 8 browser actions with
  relevant choices, zero writes and zero unrelated-form visits. Answering via
  the API resumed run 30c3da81-ced4-4737-9b1b-56d8f55b9f29 and saved draft
  PO-DEMO-0001. Replay job 032a3dee-781b-4a02-94e6-36ee094ac1e8, run
  d4d807ec-d80b-412d-9b1f-446b43212a95 returned the same ID as existing.
  Total writes: one. The fixture server was stopped after verification.
- Astra review corrected overly broad clarification wording and required actual
  browser action telemetry in the harness; final review found no concrete issues.
  The Docker API was rebuilt/recreated with the prompt after confirming no active
  runs. Existing user data and the failed run's review state were preserved.
  Final bun run check passed across all workspaces. API tests: 53 passed,
  0 failed, 169 assertions. No frontend changes in this fix.
