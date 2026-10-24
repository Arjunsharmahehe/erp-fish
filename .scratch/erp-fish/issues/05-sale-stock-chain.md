# 05: Sale Order plus Stock chain

**What to build:** The same Job continues from the Purchase Order to a Sale Order and a Stock Entry, returning all three IDs. This is the stage demo end-to-end.

**Blocked by:** 04-purchase-order-autopilot-slice.

**Status:** done (no-keys loop 2026-10-24, commit `faef78a`)

**Seam:** B (Job orchestrator) — proposed, confirm before testing. Same public Job interface extended to three steps, stubbed adapter. Never assert on call internals, only on IDs and order.

- [ ] Failing test first: full Job returns all three canned IDs in Purchase → Sale → Stock order
- [ ] Failing test first: retry after a later-step failure reuses earlier IDs with no duplicate creates
- [ ] Prior order IDs are visible to later steps through behavior, not inspected internals
