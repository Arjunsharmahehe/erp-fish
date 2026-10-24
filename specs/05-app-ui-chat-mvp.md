# App UI + Chat MVP (plan)

## Goal
Real multi-user app shell around the existing orchestrator: landing placeholder,
hand-rolled JWT auth, ERP onboarding, `/home` sidebar app, memory CRUD,
settings, and a working planning-mode chat (invoice-aware Q&A with
search/fetch). The agentic browser surface (agent mode execution view) comes
after this MVP.

## Non-goals (this MVP)
- Landing page design (static placeholder only, designed later).
- better-auth migration (hand-rolled JWT now, port later).
- Agent-mode browser run UI (chat has the mode toggle, but execution reuses
  the existing job flow; the dedicated agent surface is the next phase).
- Batch jobs, Postgres/Redis, VPS deploy (unchanged from specs/00).

## Route map

Public:
- `/` — static landing placeholder (hero stub, signup/login CTAs). No
  behavior. Designed later.
- `/login`, `/signup` — auth forms (`FieldGroup` + `Field` per shadcn
  forms rules). On success: no `erp_host` on user → `/onboarding`,
  else → `/home`.

Guarded (Next middleware, matcher `/home/:path*` + `/onboarding`):
- `/onboarding` — `Questionnaire` wizard. Step 1: ERP host URL. Step 2:
  ERP username + password. Submit → `POST /api/onboarding`.
- `/home` — chat (default, main interface).
- `/home/jobs/[id]` — existing job view, relocated (SSE log, timer, Q&A,
  time-saved, learned count).
- `/home/memory` — existing memory list, upgraded to full CRUD.
- `/home/settings` — connection + account.
- `/home/layout.tsx` — sidebar shell for all of the above.

Transition: existing top-level `/parse`, `/jobs/[id]`, `/memory` move under
`/home/*` with temporary redirects; old files deleted at the end of ticket
09. Chat absorbs parse via `Attachment` upload → existing `POST /api/parse`.

## Auth design (hand-rolled JWT, zero new deps)

- Passwords: `Bun.password.hash` / `Bun.password.verify` (bcrypt default,
  stdlib — no new package).
- Tokens: `hono/jwt` `sign` / `verify` (already inside the `hono`
  dependency — no new package). Payload `{ sub, email, iat, exp }`.
- Transport: httpOnly cookie `erp_fish_session`, `SameSite=Lax`, `Path=/`,
  `Secure` in production only. CORS keeps `CORS_ORIGIN` and adds
  `credentials: true`; web `fetch`/`hc` uses `credentials: "include"`.
- New env (fail-fast): api `JWT_SECRET` (required, no default),
  `JWT_TTL_SECONDS` (default constant, e.g. 7 days). Web needs nothing new:
  middleware verifies by calling `GET /api/auth/me` with the forwarded
  cookie (single source of truth, no secret sharing with web).
- Middleware logic: no/invalid session → `/login`. Valid session without
  `erp_host` → `/onboarding` (except when already there). Onboarded user
  visiting `/onboarding` → `/home`.

## Onboarding + credentials (never persist passwords)

- `POST /api/onboarding { erp_host, erp_username?, erp_password? }` (authed).
  Stores `erp_host` (+ `profile_id` when known) on the user row. Credentials
  are forwarded to TinyFish Vault/profile-setup when keys are configured
  (keyed phase) and are never written to SQLite. Without keys: host stored,
  profile marked pending, user proceeds (matches current no-keys posture).
- Users table: `id, email UNIQUE, password_hash, erp_host NULL,
  profile_id NULL, created_at`. `erp_host IS NOT NULL` = onboarded.
- `GET /api/auth/me` returns `{ id, email, erp_host, profile_id, vault }`
  reusing the existing vault-status logic.

## App shell (`/home` sidebar)

- `Sidebar` + `SidebarProvider` from installed components (see
  https://ui.shadcn.com/docs/components/base/sidebar and the example at
  https://ui.shadcn.com/code/apps/v4/registry/bases/base/examples/sidebar-example.tsx).
- Nav: Chat (`/home`), Jobs (recent jobs section or link to latest —
  decided in ticket 09; minimal: recent-jobs list in sidebar footer),
  Memory (`/home/memory`), Settings (`/home/settings`). Vault status stays
  visible (existing `VaultBadge`, moved into shell header).
- Thread list: server-persisted (confirmed). `chat_threads` +
  `chat_messages` tables; `GET /api/chat/threads` + `GET
  /api/chat/threads/:id`; sidebar lists the user's recent threads.

## Chat (planning mode works, agent mode stubs to jobs)

- Composition per `rules/chat.md`: `MessageScroller` owns scroll,
  `Message` rows, `Bubble` surfaces, `Attachment` for uploads, `Marker`
  for system notes/dividers. Never hand-rolled bubbles or scroll containers.
- Header: `ToggleGroup` with two modes: `planning` | `agent` (2–7 option
  sets use ToggleGroup per shadcn rules).
- Planning mode: `POST /api/chat { messages, invoice?, mode: "planning" }`.
  Server builds system prompt (invoice JSON injected when attached) and
  calls the existing OpenAI-compat chat path. Tools, both gated on
  TinyFish keys per specs/03 §4 ("all web access via TinyFish"):
  - `fetch_url` → TinyFish Fetch. Keys absent → tool omitted, model told
    browsing is unavailable, endpoint stays 200 with degraded notice.
  - `web_search` → TinyFish Search, same gating.
  - Response `{ message, citations[] }`. No streaming in MVP (JSON
    request/response; streaming is a fast follow, not MVP).
- Attachment flow: chat `Attachment` → existing `POST /api/parse` (PDF via
  LLM or JSON paste) → parsed invoice shown as context card above composer,
  included in subsequent `/api/chat` calls.
- Agent mode (MVP): composer collects invoice + instruction, calls existing
  `POST /api/jobs` (server fills `erp_host`/`profile_id` from the session,
  ignoring client values), then embeds/navigates to `/home/jobs/[id]`.
  Dedicated agent execution surface is the next phase, not this MVP.
- Onboarding wizard uses `Questionnaire`
  (https://ui.shadcn.com/docs/components/base/questionnaire); settings uses
  `Tabs` + `Card` + `FieldGroup`; memory uses `Table` + `Dialog` (edit) +
  `AlertDialog` (delete); destructive actions keep `AlertDialog`.

## Memory CRUD + settings (API additions)

- `PUT /api/memory { erp_host, q_norm, answer }` — edit learned answer
  (upsert path already exists in `db.ts`).
- `DELETE /api/memory?erp_host=&q_norm=` — delete entry (new query schema
  in `shared`).
- `PATCH /api/auth/settings { erp_host?, profile_id? }` — settings page
  connection update. Password change deferred (noted, not built).
- Jobs are scoped to the session user: `jobs.user_id` column (nullable for
  pre-auth rows), set on create; `GET /api/jobs/:id` and answer routes
  reject other users' jobs with 404 (no existence leak).

## Shared schema additions (`packages/shared`)

- `SignupRequest { email, password }`, `LoginRequest` (same shape),
  `SessionUser { id, email, erp_host|null, profile_id|null, vault }`.
- `OnboardingRequest { erp_host, erp_username?, erp_password? }`
  (password optional so keyless onboarding stores host only).
- `ChatRole`, `ChatMessage { role, content }`,
  `ChatRequest { messages: ChatMessage[], invoice?: InvoiceJSON,
  mode: "planning" }`, `ChatResponse { message, citations: string[] }`.
- `MemoryUpdateRequest { erp_host, q_norm, answer }`,
  `MemoryDeleteQuery { erp_host, q_norm }`.

## DB migrations (all `CREATE TABLE IF NOT EXISTS` style in `openDb`)

- `users(...)` new table. `jobs ADD COLUMN user_id TEXT` guarded by
  `PRAGMA table_info` check (no duplicate-column crash on restart).
- `chat_threads(id, user_id, title, created_at)`,
  `chat_messages(id, thread_id, role, content, created_at)` for persisted
  threads (confirmed scope).

## Env changes

- api: `JWT_SECRET` required (boot crash with naming message when missing),
  `JWT_TTL_SECONDS` default constant. Nothing else new; TinyFish/OpenAI
  vars unchanged.
- web `.env.example`: document login flow needs `NEXT_PUBLIC_API_URL` only.

## TDD seams

Tickets 08/09/11 are infra-shaped (auth gating, shell, CRUD forms):
manual verification only, same as tickets 01/02/07 — no new seams.
Ticket 10 proposes **seam D (planning chat)**: `POST /api/chat` with a
stubbed chat LLM returns the canned answer + citations; never assert on
prompt wording. Confirm before testing, mirroring seam A.

## Build order

1. 08 auth + onboarding (blocks everything behind login).
2. 09 shell + route moves (sidebar, `/home/*`, redirects, delete olds).
3. 11 memory CRUD + settings (needs authed shell in place).
4. 10 planning chat (needs shell + parse endpoint; capstone).

Acceptance: signup → onboard (host only, no keys) → chat planning answers
invoice questions → attach PDF/JSON → agent mode creates job → job completes
via demo agent → memory entry editable/deletable → settings host update
takes effect → `bun run check` green + doctor clean on touched files.
