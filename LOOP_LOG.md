# LOOP_LOG — erp-fish no-keys build loop

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
