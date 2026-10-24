# LOOP_LOG — erp-fish no-keys build loop

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
