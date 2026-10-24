# Track 3 — Reconciliation: integrate plan-mode end to end

**Owner:** whoever merges (default: backend lane). Do this only when Track
1 and Track 2 both report done on their branches.

## Objective
Merge both lanes, resolve contract drift, and prove the full plan-mode loop
live. Output is the `plan-mode-e2e` milestone: auth → onboard → planning
chat over an invoice, working against one stack.

## Prerequisites
- `backend/plan-mode` pushed, gates green (check + tests).
- `frontend/plan-mode` pushed, gates green (check + doctor clean on
  touched files).
- Both lanes' `## Track N contract gaps` LOOP_LOG sections reviewed (empty
  is the expected case).

## Steps
1. **Merge backend first** (it owns `packages/shared`, the contract):
   ```bash
   git checkout main && git pull
   git merge backend/plan-mode
   ```
2. **Rebase frontend onto the merge**, resolving conflicts. Likely
   hotspots: `packages/shared/index.ts` (only if Track 1 touched it —
   it shouldn't have), `apps/web` route files both lanes never share, so
   expect a clean rebase. If Track 1 edited `shared` or `apps/api`,
   revert those hunks to the backend version and re-verify Track 1 gates.
3. **Single-stack integration run** (one api `:3001` + one web `:3000`,
   `DEMO_AGENT=true`, no keys — keyless posture):
   - signup → redirected to `/onboarding` → host-only onboard →
     `/home`.
   - New chat: ask about the demo invoice (paste JSON via attachment) →
     planning answer cites invoice values.
   - Reload: thread appears in sidebar, history intact.
   - logout → `/home` bounces to `/login`; login restores session.
   - Kill-keys simulation is N/A (already keyless); confirm degraded
     chat path returns `200` with the notice, not an error state.
4. **Contract drift protocol** — any mismatch found here is fixed on the
   side that drifted from the frozen tables, then BOTH lane gates re-run.
   Record the amendment in `LOOP_LOG.md` (`## Track 3 amendments`).
5. **Final gates** — from repo root: `bun run check` green; api
   `bun test` green; `bunx react-doctor@latest --verbose` from
   `apps/web` clean on touched files. Then:
   ```bash
   git tag plan-mode-e2e && git push origin main --tags
   ```
6. **Cleanup** — delete merged branches + friend's worktree registration
   (`git worktree remove ../erp-fish-frontend` after she pulls the merge).
   Log the milestone in `LOOP_LOG.md` with what (if anything) deferred to
   the agent phase.

## Common failures
- **Cookie not set / me 401s behind the app**: CORS `credentials: true`
  on api + `credentials: "include"` on web fetches; cookie `SameSite=Lax`
  works on localhost across ports.
- **Old top-level routes 404**: Track 1 owns redirects `/parse`,
  `/jobs/[id]`, `/memory` → `/home/*`; verify each redirect target exists.
- **Stale contract types**: web's `hc<AppType>` infers from api — after
  merging backend first, Track 1 must `bun install`/retypecheck post-rebase.

## Done when
Milestone checklist passes with no code changes mid-run, gates green,
tag pushed. Unblocks: agent-mode execution UI (next phase).
