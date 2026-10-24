# Architecture

## Monorepo (Bun, CLI-init only)
- Root: `bun init` workspaces.
- `apps/web`: `create-next-app` (Next.js, Tailwind). Pages: Upload, Job detail (SSE log), Q&A inbox, Memory list.
- `apps/api`: `create-hono` (Hono on Bun, port 3001). SQLite via `bun:sqlite`. No BullMQ.
- `packages/shared`: Zod schemas shared by web/api: `InvoiceJSON`, `JobInput`, `AgentOutput`, `MemoryEntry`.
- Rule: never hand-write `package.json`. Use CLIs. Web imports `AppType` from api workspace for `hc` client.

## Runtime flow
`Next.js -> Hono RPC -> Orchestrator -> TinyFish SDK -> ERPNext (Cloudflare Tunnel)`.
LLM parse via OpenAI-compat side-call before orchestration.

## Hono routes (RPC, Zod-validated)
- `POST /api/profiles/setup` — create Profile + Vault link, returns `{profile_id, erp_host}`. Stores only host+id, never password.
- `POST /api/jobs` — `{invoice_json, instruction, erp_host, profile_id}` -> creates `job Queued`, starts orchestrator async.
- `GET /api/jobs/:id` — job + tasks + questions.
- `GET /api/jobs/:id/stream` — proxies TinyFish `run-sse` events as SSE to Next.js.
- `POST /api/questions/:id/answer` — `{answer}` -> writes `memory`, retries current step with enriched goal.
- `GET /api/memory?erp_host=` — list learned QnA.

## DB (SQLite)
- `jobs(id, erp_host, profile_id, invoice_json, instruction, status, run_ids, result_ids, created_at)`
- `tasks(id, job_id, kind[PO|SO|STOCK], status, agent_run_id, output_id)`
- `questions(id, job_id, q_norm, q_raw, answer, status)`
- `memory(erp_host, q_norm, answer, updated_at)` — PK `(erp_host, q_norm)`. `q_norm` = lowercase trim for MVP.

## Orchestrator (CONFIRMED single high seam for TDD — see specs/04)
One `Job Orchestrator` module owns: parse-validate -> memory inject -> sequential Agent calls -> Q&A pause/resume -> result collect.
- UX shows one mega-job, backend runs 3x sequential `run-async` (PO->SO->Stock). Rationale: true single-goal flakes on slow dropdowns with no partial resume; sequential preserves pitch with resume + dedupe.
- Each step goal includes: memory context + check-then-create clause + `output_schema`.
- On `NEED_INPUT`/low-confidence: insert `question Queued`, set `job Waiting`, stop chain. On answer: upsert `memory`, retry step with `goal + Q&A`.

## Frontend
- Upload PDF -> calls LLM parse endpoint -> shows JSON preview + editable fields + instruction box -> Submit creates job.
- Job view subscribes to SSE stream, renders TinyFish `PROGRESS/COMPLETE` + elapsed timer + order IDs when done.
- Q&A inbox polls `questions?status=Queued`, inline answer box.

## Config (env, local demo only)
- `TINYFISH_API_KEY`, `ERP_BASE_URL` (tunnel HTTPS), `TUNNEL_PROFILE_ID`
- `OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL` (default opencode go free)
- Ports: web 3000, api 3001, CORS `localhost:3000` only.
