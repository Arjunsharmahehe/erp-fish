# AGENTS.md — erp-fish

Bun monorepo: `apps/web` (Next.js), `apps/api` (Hono), `packages/shared` (Zod schemas).
Do not edit `apps/web/AGENTS.md` — it is managed by `next dev`.

## 1. YAGNI
Build only what the ticket needs. No speculative features, no future-proofing,
no extra packages. If it is not required for the current acceptance criteria,
do not add it.

## 2. No hardcoded strings or numbers
Every string/number comes from one of: validated env (`@t3-oss/env-*`),
a config object, a named constant, or an enum. No magic literals inline —
not even timeouts, ports, routes, or doctype names. Fix violations on sight.

## 3. Strict TypeScript
`strict` on, no `any`, no unchecked indexing, no `as` casts to silence errors.
Validate all boundaries (RPC inputs, LLM output, TinyFish results) with Zod
schemas from `packages/shared`. Prefer `hc<AppType>` inference over
hand-written client types.

## 4. Next.js work
- Before writing any Next.js code, read the relevant guide in
  `apps/web/node_modules/next/dist/docs/` — this is not the Next.js from
  training data. Heed deprecation notices.
- After changing `apps/web`, run static analysis:
  `bunx react-doctor@latest --verbose`
  and address its findings before marking the work done.

## 5. Code review after every feature
After each frontend, backend, or full-stack feature, spawn a code-review
subagent covering the changed scope before moving on.

## 6. Redundancy
Duplicated logic in more than 2 places gets an abstraction in the owning
module. Never abstract on the second use — an early abstraction is usually
the wrong one. Prefer deleting the shallow copy over adding a wrapper.

## 7. Review models
- Read-only exploration (redundancy sweeps, trivial issue scans):
  Nemotron 3.5 VL only — `opencode/nemotron-3.5-super-vl-free`
  (alt: `openrouter/nvidia/nemotron-3.5-super-vl`). Never write code with it.
- Real code review: Muse-family only
  (`opencode/muse-wonder-1.0`, `opencode-go/muse-spark-1.3-contributor`).

## 8. Definition of done
`bun run lint` and `bun check` are green before any ticket closes, plus
`bunx react-doctor@latest --verbose` for web changes. A failing gate is fixed
first — never worked around, never committed over.

## 9. TDD seams
Test only at the confirmed seams in `specs/04`: A (Parse), B (Job
orchestrator), C (Memory). Infra (scaffold, tunnel/seed, polish) is manual
verification only. Red before green, one behavior per cycle, expected values
from the frozen demo fixture — never recomputed from the code under test.

## 10. Error handling
Never swallow errors. Typed errors at boundaries, Hono routes fail with typed
HTTP exceptions and correct status codes. Retries and Q&A pauses depend on
distinguishing retriable, fatal, and needs-input failures — do not collapse
them into one catch.

## 11. Logging
`pino` in api, no `console.log` in committed code. Never log secrets, API
keys, Vault material, or invoice PII. Log Job IDs and agent run IDs on every
orchestrator transition so a failed demo run is traceable in seconds.

## 12. Env fail-fast
Validate env at boot and crash with a clear message naming the missing var.
A bad env must fail in seconds at startup, never mid-run inside an agent
call on stage.

## 13. Idempotency
Every ERP write goes through check-then-create (search by invoice_no +
party first, return the existing ID). No blind creates, no unconditional
retries. This is the anti-dupe guarantee — do not bypass it for speed.

## 14. Import hygiene
Import workspaces by package name (`shared`), never by deep relative paths
into another app. No circular deps between orchestrator, adapter, and memory.
Shared Zod schemas live in `packages/shared` only — never duplicated per app.

## 15. Code quality rules
- Run `bun run check` before reporting any task as done.
- Never use `as` assertions, `any`, `@ts-ignore`, or non-null `!`. Parse
  external data with zod.
- In `apps/web`, use components from the `ui` directory and design tokens.
  No raw colors or arbitrary Tailwind values.
- Never loosen lint config to pass. Ask first.
- Lint status (Oct 2026): TypeScript is pinned to 6.0.3 because
  `typescript-eslint` refuses the TS 7 native API (tracks TS >=7.1 support).
  `bun run check` (typecheck + ESLint on TS files) is green. The `ui/`
  scaffold ignore in `apps/web/eslint.config.mjs` is temporary — remove it
  once the scaffold is cleaned up (tracked in LOOP_LOG). Re-upgrading to TS 7
  later is a version bump plus a `typescript-eslint` upgrade, no config
  rewrite needed.

## 16. Hono routes
Register API routes by chaining on one `Hono` instance
(`new Hono().use(...).get(...)`). Split-statement registration drops the
route from `AppType` (BlankSchema), and `hc` clients silently degrade to
`unknown`. Never `const app = new Hono(); app.get(...)` discarding the
return.
