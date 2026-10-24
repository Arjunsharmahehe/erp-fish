# Track 2 — Backend: plan-mode API

**Owner:** backend lane. **You own:** `apps/api/**` AND `packages/shared`
(contract lives here — you are its keeper). Never edit `apps/web/**`.

## Objective
Build the plan-mode backend against the frozen contract below: hand-rolled
JWT auth, onboarding, and the planning chat endpoint with persisted threads.
Frontend (Track 1) builds against this contract in parallel without waiting
for you.

## Non-goals (do NOT build)
- Agent-mode execution, `jobs.user_id` scoping, server-filled
  `erp_host`/`profile_id` on job create (all move with the agent phase).
- Memory `PUT`/`DELETE`, settings `PATCH` (ticket 11, later phase).
- Chat streaming, web_search/fetch beyond TinyFish gating, embedding memory.

## Setup
```bash
git checkout -b backend/plan-mode   # in the main checkout
```
Your stack: defaults (`:3000` web / `:3001` api). Add to
`apps/api/.env.local`: `JWT_SECRET=<long random, never commit>`,
`DEMO_AGENT=true` for local runs.

## Frozen contract (you implement exactly this; changes need a LOOP_LOG note + ping Track 1)
| Method + path | Req body (shared Zod schema) | Success |
|---|---|---|
| `POST /api/auth/signup` | `SignupRequest {email, password}` | `201 {user: SessionUser}` + cookie |
| `POST /api/auth/login` | `LoginRequest` (same shape) | `200 {user}` + cookie |
| `POST /api/auth/logout` | — | `200`, clears cookie |
| `GET /api/auth/me` | cookie | `200 SessionUser` / `401` |
| `POST /api/onboarding` | `OnboardingRequest {erp_host, erp_username?, erp_password?}` | `200 SessionUser` |
| `POST /api/chat` | `ChatRequest {thread_id?, messages: ChatMessage[], invoice?, mode: "planning"}` | `200 ChatResponse {message, citations[], thread_id}` |
| `GET /api/chat/threads` | cookie | `200 ThreadListItem[]` |
| `GET /api/chat/threads/:id` | cookie | `200 {thread, messages[]}` / `404` others' threads |

- `SessionUser {id, email, erp_host|null, profile_id|null, vault}`.
  `ChatMessage {role: "user"|"assistant", content}`.
- Cookie: `erp_fish_session`, httpOnly, `SameSite=Lax`, `Path=/`,
  `Secure` in production only. CORS keeps `CORS_ORIGIN`, adds
  `credentials: true`.
- Keyless degraded chat: `200` with browsing-unavailable notice inside
  `message`, `citations: []`. Never `503` for missing keys on this route.

## Tasks
1. **Schemas (`packages/shared`)** — add `SignupRequest`, `LoginRequest`,
   `SessionUser`, `OnboardingRequest`, `ChatRole`, `ChatMessage`,
   `ChatRequest`, `ChatResponse`, thread list/detail schemas. Follow the
   file's existing constant-driven style (no magic literals).
2. **Users + env** — `users(id, email UNIQUE, password_hash, erp_host
   NULL, profile_id NULL, created_at)` via `CREATE TABLE IF NOT EXISTS`
   in `openDb`. `JWT_SECRET` required env (boot crash naming it when
   missing), `JWT_TTL_SECONDS` default constant. Passwords via
   `Bun.password.hash/verify`; tokens via `hono/jwt` `sign/verify`.
   Zero new dependencies.
3. **Auth routes** — signup (409 on duplicate email, no existence leak
   beyond that), login (401 wrong credentials), logout, me. Chain on the
   single `Hono` instance (repo rule §16 — never split-statement
   registration or `AppType` degrades for `hc`).
4. **Onboarding route** — authed; stores `erp_host` (+ `profile_id` when
   known). Credentials forwarded to Vault/profile-setup ONLY when
   TinyFish keys configured (keyed phase); never written to SQLite.
   Host-only (no credentials) must succeed — keyless onboarding is the
   norm until keys land.
5. **Threads storage** — `chat_threads(id, user_id, title, created_at)`,
   `chat_messages(id, thread_id, role, content, created_at)`. Title from
   first **user-role** message (truncate with a named constant). All thread routes
   scoped by session user; foreign threads → `404` (no leak).
   **Send contract (Track 1 reads this): clients send the FULL message
   list each call (cumulative, not deltas); the server appends only user
   turns beyond the stored user count, so resends never duplicate.
   Client `assistant` messages are never stored — only server replies.**
6. **Planning chat (seam D — red-green, confirm seam before testing)** —
   stub the chat LLM first (canned answer, mirroring seam A style):
   (a) planning answer over an attached invoice echoes invoice values from
   the frozen demo literal; (b) keys absent → `200` degraded, tools
   omitted, no crash. Then real path: system prompt + injected invoice
   JSON via the existing OpenAI-compat chat helper; `fetch_url` /
   `web_search` tools backed by TinyFish ONLY (specs/03 §4), omitted from
   the tool list when keys absent. Typed errors at boundaries; never
   swallow (repo rules §10/§11: `pino`, no `console.log`, no secret/PII
   in logs — log thread IDs, never message content or credentials).
7. **Env fail-fast + docs** — missing `JWT_SECRET` crashes at boot with a
   naming message. Update `apps/api/.env.example`.

## Verification
- `bun run check` green; `bun test` green (existing 21 + new seam-D
  tests); no new seams beyond D.
- Manual: signup → me → chat (keyless degraded) → threads list/detail →
  logout → me is 401. Passwords absent from SQLite (`select` the row).
- Review rule: after finishing, run a code-review subagent (Muse-family
  only) over the changed scope before merging.

## Done when
Gates green + manual loop passes + contract matches the table exactly.
Commit on `backend/plan-mode`, push. Integration happens in Track 3.
