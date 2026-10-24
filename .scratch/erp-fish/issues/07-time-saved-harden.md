# 07: Time-saved plus harden

**What to build:** Demo-ready polish proving manager time saved with safe failure handling on the demo machine.

**Blocked by:** 05-sale-stock-chain, 06-ask-once-memory-slice.

**Status:** ready-for-agent

**Seam:** None — manual verification only (timers, wallet, tunnel drops are demo-time behavior).

**TDD loop:** No red-green cycle. Verify by rehearsal: full single-invoice run passes with no mid-demo code changes.

- [ ] Job view shows manual baseline versus agent elapsed time plus learned-count
- [ ] Vault connection status is visible and stale sessions repair without pasting passwords
- [ ] Wallet cost, tunnel drop, and Agent timeout all show clear recoverable messages
- [ ] Full single-invoice rehearsal passes on the demo machine with no code changes mid-demo
