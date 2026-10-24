# 04: Purchase Order autopilot slice

**What to build:** One Job turns validated invoice plus instruction into a real Purchase Order in ERPNext with live progress and no duplicates on retry.

**Blocked by:** 01-cli-monorepo-scaffold, 02-tunnel-erpnext-seed-vault-proof, 03-invoice-parse-slice.

**Status:** ready-for-agent

**Seam:** B (Job orchestrator) — proposed, confirm before testing. Create Job via the public interface with a stubbed TinyFish adapter, observe order ID plus progress events. Never mock internals or assert on goal wording.

**TDD loop:** Red-green per behavior with canned adapter IDs from the seeded masters.

- [ ] Failing test first: valid Job returns the canned purchase order ID and emits progress to completion
- [ ] Failing test first: retry with the same invoice number and supplier returns the existing ID without a second create call
- [ ] Failing test first: agent doubt pauses the Job with a queued Question instead of guessing
- [ ] Live run uses authenticated Profile plus Vault and waits explicitly on slow options
