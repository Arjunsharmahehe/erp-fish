# erp-fish

Bun monorepo: `apps/web` (Next.js) + `apps/api` (Hono) + `packages/shared` (Zod).

## Env

Copy each `.env.example` to `.env.local` and fill in:

- `apps/api/.env.example` — `PORT` (default 3001), `CORS_ORIGIN` (default http://localhost:3000)
- `apps/web/.env.example` — `NEXT_PUBLIC_API_URL` (e.g. http://localhost:3001)

API validates env at boot and crashes naming the missing var. Web validates via `@t3-oss/env-nextjs`.

## Run

```bash
bun install
bun run --filter 'api' dev     # http://localhost:3001/api/hello
bun run --filter 'web' dev     # http://localhost:3000 (shows API hello)
```

## Check

```bash
bun run typecheck   # tsc --noEmit per workspace (active gate)
bun run lint        # blocked upstream: typescript-eslint refuses TS 7 native API; see AGENTS.md §15
```
