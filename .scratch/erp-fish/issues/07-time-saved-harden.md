# 07: Time-saved plus harden

**What to build:** Demo-ready polish proving manager time saved with safe failure handling on the demo machine.

**Blocked by:** 05-sale-stock-chain, 06-ask-once-memory-slice.

**Status:** partial — everything minus rehearsal done (no-keys loop 2026-10-24, commit `9c3d706`); rehearsal blocked on keys + live tunnel

## Progress (no-keys loop 2026-10-24)
- Done without keys: job routes (POST/GET/stream-replay/answer/memory/
  profiles-status), demo agent behind `DEMO_AGENT=true`, job view (log,
  timer, time-saved vs 25-min baseline, learned count, Q&A inbox),
  memory page, Vault badge, error messaging paths. Verified via curl +
  page loads against the demo agent.
- NOT done (keyed phase): real TinyFish adapter, background execution +
  live SSE tailing, Vault repair behavior, wallet/tunnel/timeout live
  failures, full single-invoice rehearsal. See LOOP_LOG.md KEYED PHASE
  items 4–7.

**Seam:** None — manual verification only (timers, wallet, tunnel drops are demo-time behavior).

**TDD loop:** No red-green cycle. Verify by rehearsal: full single-invoice run passes with no mid-demo code changes.

- [ ] Job view shows manual baseline versus agent elapsed time plus learned-count
- [ ] Vault connection status is visible and stale sessions repair without pasting passwords
- [ ] Wallet cost, tunnel drop, and Agent timeout all show clear recoverable messages
- [ ] Full single-invoice rehearsal passes on the demo machine with no code changes mid-demo
