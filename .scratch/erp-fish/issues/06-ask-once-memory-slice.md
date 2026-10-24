# 06: Ask-once Memory slice

**What to build:** When the agent is doubtful it pauses with a clear question, the answer is memorized per ERP host, and the repeat run asks nothing.

**Blocked by:** 04-purchase-order-autopilot-slice.

**Status:** done (no-keys loop 2026-10-24, commit `8bca87c`)

**Seams:** B plus C (Job orchestrator plus Memory) — proposed, confirm before testing. Answer via the public Question interface, observe resume plus reuse. Never query the memory table directly in tests.

**TDD loop:** Red-green with the frozen demo host plus a known question literal.

- [ ] Failing test first: answering a queued Question resumes the paused Job and completes the step
- [ ] Failing test first: the same doubt on the next Job for the same host produces zero new Questions
- [ ] Failing test first: a different host still asks (memory is correctly scoped)
- [ ] Memory list behavior shows the learned entry and count
