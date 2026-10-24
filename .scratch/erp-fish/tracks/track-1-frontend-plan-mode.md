# Track 1 — Frontend: plan-mode UI

**Owner:** frontend lane. **You own:** `apps/web/**` ONLY. Read-only on
`packages/shared` (contract) and `apps/api` (reference). Never edit them —
if a schema gap blocks you, mock around it and log it in `LOOP_LOG.md`
under `## Track 1 contract gaps`; Track 3 resolves it.

## Objective
Build the plan-mode UI against the frozen contract below: auth pages,
onboarding wizard, minimal landing, `/home` shell with sidebar, and the
planning chat interface. No backend changes needed to finish this track.

## Non-goals (do NOT build)
- Agent-mode execution UI (next phase; the mode toggle exists but agent
  mode just links to the job view later).
- Memory CRUD, settings forms, landing design (placeholder only).
- Chat streaming (JSON request/response), thread search/rename.

## Setup
```bash
git worktree add ../erp-fish-frontend -b frontend/plan-mode
cd ../erp-fish-frontend && bun install
cp ../erp-fish/apps/web/.env.local apps/web/.env.local
cp ../erp-fish/apps/api/.env.local apps/api/.env.local
```
Your stack (both run concurrently with Track 2):
- api `.env.local`: `PORT=3101`, `CORS_ORIGIN=http://localhost:3002`,
  `DEMO_AGENT=true`
- web `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3101`
- web dev: `bun run dev -- --port 3002` (from `apps/web`)

## Frozen contract (build against this; it does not move without a LOOP_LOG note)
| Method + path | Req body | Success |
|---|---|---|
| `POST /api/auth/signup` | `{email, password}` | `201 {user}` + cookie |
| `POST /api/auth/login` | `{email, password}` | `200 {user}` + cookie |
| `POST /api/auth/logout` | — | `200`, clears cookie |
| `GET /api/auth/me` | cookie | `200 {id, email, erp_host, profile_id, vault}` / `401` |
| `POST /api/onboarding` | `{erp_host, erp_username?, erp_password?}` | `200 {user}` |
| `POST /api/chat` | `{thread_id?, messages: [{role, content}], invoice?, mode: "planning"}` | `200 {message, citations[], thread_id}` |
| `GET /api/chat/threads` | cookie | `200 [{id, title, created_at}]` |
| `GET /api/chat/threads/:id` | cookie | `200 {thread, messages[]}` |

Roles are `"user" | "assistant"`. All failures: `4xx` via HTTPException.
Keyless degraded chat still returns `200` with a notice in `message`.

## Tasks
1. **Landing (`/`)** — minimal functional: product name, one-line pitch,
   Sign up / Log in buttons, auth-aware redirect (session → `/home`).
   Static, no data fetching.
2. **Auth pages** — `/login`, `/signup` with `FieldGroup` + `Field`
   (shadcn forms rules), error display from `4xx`, success → redirect
   chain (no `erp_host` → `/onboarding`, else `/home`).
3. **Onboarding (`/onboarding`)** — `Questionnaire` wizard: step 1 ERP
   host URL, step 2 ERP username + password (both optional — host-only
   onboarding must work keyless). Submit → `POST /api/onboarding`.
4. **Middleware** — matcher `/home/:path*`, `/onboarding`: verify via
   `GET /api/auth/me` with forwarded cookie. Backend absent/unreachable
   counts as unauthenticated. Unauth → `/login`; authed without
   `erp_host` → `/onboarding` (unless there); onboarded on `/onboarding`
   → `/home`.
5. **`/home` shell** — `Sidebar` + `SidebarProvider` (see
   https://ui.shadcn.com/docs/components/base/sidebar). Nav: Chat
   (`/home`), Memory + Settings entries render placeholder `Empty` states
   (wired in a later phase — do not build their forms). `VaultBadge` in
   the shell header. Sidebar footer lists recent threads (from
   `GET /api/chat/threads`); clicking loads the thread.
6. **Planning chat (`/home`)** — per `rules/chat.md`: `MessageScroller`
   owns scroll, `Message` rows, `Bubble` surfaces, `Attachment` uploads,
   `Marker` for system notes. Header `ToggleGroup`: planning | agent
   (agent mode out of scope — selecting it shows a "coming next" note, no
   dead-end crash). `Attachment` → existing `POST /api/parse` → invoice
   context card above composer, included in `/api/chat` calls. New
   conversation button clears `thread_id`. Title = first user message
   (client-computed, server is source of truth on reload).
7. **Next.js compliance** — before writing code, read the relevant guide
   in `apps/web/node_modules/next/dist/docs/` (repo rule, not optional).
   Async data access goes inside `<Suspense>` (see the `/` + `/jobs/[id]`
   fix already in tree). No `instant = false` opt-outs.

## shadcn rules (enforced by lint)
`gap-*` not `space-*`; `size-*` for square dims; `cn()` for conditionals;
semantic colors only; `Skeleton` for loading, `Empty` for empty states,
`Badge` for statuses; icons via `data-icon`, no sizing classes; dialogs
always have a `Title`. Do NOT touch `src/components/ui/**` or the three
ignored scaffold files — the temp ignore in `eslint.config.mjs` stays.

## Verification (backend NOT required)
- `bun run check` green (typecheck ×3 + eslint ×4).
- `bunx react-doctor@latest --verbose` from `apps/web`: zero findings in
  files you touched (scaffold findings are pre-existing, ignore them).
- Browser, backend down: `/` renders; `/home` → `/login` (redirect
  observable without backend). Backend up (Track 2 or `DEMO_AGENT`
  stub): full signup → onboard (host-only) → chat loop works.
- No `console.log` in committed code; no hardcoded strings/numbers
  (constants or shared schemas).

## Done when
Gates green + all pages render + redirect chain behaves + chat UI sends
the exact contract shapes (verify payloads in devtools). Live backend
verification happens in Track 3. Commit on `frontend/plan-mode`, push.

## Notes for the agent executing this track (read first)
- **Do not "fix" the component scaffold.** `src/components/ui/**` plus
  `src/hooks/use-mobile.ts`, `src/hooks/use-highlighted-code.ts`, and
  `src/lib/highlighter.tsx` are covered by a temporary ignore in
  `apps/web/eslint.config.mjs`. That ignore stays. Never edit those
  files; if lint or react-doctor flags them, they are out of scope —
  fix only files you created or touched.
- **This is not the Next.js you know.** Before writing any Next.js code,
  read the relevant guide in `apps/web/node_modules/next/dist/docs/`.
  Concretely: every async data access must render inside `<Suspense>`
  with a fallback (see the existing `HomeContent` / `JobPageContent`
  pattern) — never add `export const instant = false` to silence
  blocking-route errors.
- **Ownership is a hard boundary.** You may read `packages/shared` and
  `apps/api` for reference, but edit `apps/web/**` only. If a schema or
  endpoint gap blocks you, mock around it, finish the track, and log the
  gap in `LOOP_LOG.md` under `## Track 1 contract gaps` — Track 3
  resolves it. Do not invent contract changes unilaterally.
- **Gates before done:** `bun run check` from repo root, plus
  `bunx react-doctor@latest --verbose` from `apps/web` with zero findings
  in your files. No `console.log`, no hardcoded strings/numbers, no `as`
  casts, no new dependencies without asking the human.
- **Branch and push:** all work commits on `frontend/plan-mode`; push the
  branch when the track is done so Track 3 can rebase it.
