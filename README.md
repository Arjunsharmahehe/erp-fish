# erp-fish

Bun monorepo: `apps/web` (Next.js) + `apps/api` (Hono) + `packages/shared` (Zod).

## Env

Copy each `.env.example` to `.env.local` and fill in:

- `apps/api/.env.example` — `PORT` (default 3001), `CORS_ORIGIN`, `DB_PATH`
  (default erp-fish.db), `DEMO_AGENT` (`true` serves canned order IDs for
  no-keys UI verification; `false` returns 503 until the live TinyFish
  adapter lands), `ERP_BASE_URL` + `TUNNEL_PROFILE_ID` (keyed phase),
  `OPENAI_*` (PDF/text parse only; JSON paste works without).
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ERP_HOST`
  + `NEXT_PUBLIC_PROFILE_ID` (defaults target the local demo).

API validates env at boot and crashes naming the missing var. Web validates
via `@t3-oss/env-nextjs`.

## Run

```bash
bun install
bun run --filter 'api' dev     # http://localhost:3001/api/hello
bun run --filter 'web' dev     # http://localhost:3000 (shows API hello)
```

With `DEMO_AGENT=true`: parse an invoice at `/parse`, start the autopilot
job, watch `/jobs/:id` (SSE replay + polling), answer questions inline,
inspect learned memory at `/memory`. The demo agent always returns the
canned IDs, and asks its one question only when the instruction contains
`doubt` (case-sensitive) — the real agent reads the goal instead.

## Check

```bash
bun run typecheck   # tsc --noEmit per workspace (active gate)
bun test            # seam tests A/B/C (api)
bun run lint        # blocked upstream: typescript-eslint refuses TS 7 native API; see AGENTS.md §15
```
