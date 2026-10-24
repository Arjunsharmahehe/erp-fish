# Data Model, API Contracts, Testing (TDD)

## Shared Zod shapes (packages/shared)
- `InvoiceJSON = { supplier:string, invoice_no:string, items:{name:string, qty:number, rate:number}[], warehouse_hint?:string }`
- `AgentOutput = { purchase_order_id?:string, sales_order_id?:string, stock_entry_id?:string }`
- `MemoryEntry = { erp_host:string, q_norm:string, answer:string }`

## Check-then-create contract
Every Agent goal MUST contain: "Search existing {Doctype} by invoice_no={invoice_no} + party={supplier/customer}. If found, return its ID and do not create. Else create and return new ID." Prevents dupes on retry. Requires `invoice_no` searchable — add custom field in ERPNext v16 tonight if missing.

## QnA memory contract
- Ask format: `{q_raw, q_norm, context:{field, candidates}}`.
- Store on answer: upsert `memory(erp_host,q_norm)`.
- Reuse: prepend `Learned: Q->A` list for `erp_host` into every goal prompt. Success metric: Q count drops to 0 on repeat invoice.

## LLM parse contract (OpenAI-compat)
- Input: PDF text or image.
- System prompt: "Return ONLY valid JSON matching InvoiceJSON. No prose. Use exact numbers."
- Validate with Zod, on fail create `question` for manual fix, never hallucinate items.

## TDD: what a good test is
Tests verify behavior through public interfaces, not implementation. A good test reads as a specification and survives refactors. Expected values come from independent truth (the frozen demo invoice literal, the seeded ERP masters), never recomputed the way the code computes them.

Anti-patterns banned: implementation-coupled (mocking internals, querying SQLite directly instead of going through the interface), tautological (asserting code output equals itself), horizontal slicing (all tests up front). One vertical slice at a time: one failing test, minimal code to pass, repeat.

Rules of the loop: red before green, one seam plus one test plus one minimal implementation per cycle, no speculative features, refactoring happens after green in review, not inside the loop.

## TDD seams (CONFIRMED — test only here)
- Seams are the public boundaries tests observe without reaching inside. No test at an unconfirmed seam.
- A. Parse seam — public interface takes invoice input and returns validated InvoiceJSON or a fix request. Catches wrong supplier/qty/rate and fallback behavior. Misses upload UI wiring and ERP writes.
- B. Job orchestrator seam — public interface creates a Job and returns order IDs, and answers a Question to resume. Catches PO→SO→Stock sequencing, check-then-create dedupe, pause/resume, memory injection. Misses real browser flake and pixel UI.
- C. Memory seam — public interface stores an answer per ERP host and returns learned context. Catches repeat questions and normalization. Misses Agent prompt wording.
- Infra tickets (scaffold, tunnel/seed, polish) have no automated seam for the 2hr build — verified by manual demo pass plus wallet/order-ID check, not unit tests.

## Per-ticket test placement
- 03 parse uses seam A only, with stubbed LLM returning the frozen demo literal.
- 04 and 05 use seam B only, with stubbed TinyFish adapter returning canned order IDs and NEED_INPUT on demand.
- 06 uses seams B plus C together for pause/answer/reuse.
- 01, 02, 07 use manual verification (servers up, tunnel reachable, timer visible), no automated tests to protect live-build time.

## Out of scope
Batch-10 parallel, auto-create Supplier/Item masters, embedding memory, trace replay, Frappe REST, MFA/CAPTCHA, multi-user, Postgres/Redis, VPS deploy.

## Build plan (no code yet)
Tonight: ERPNext v16 docker up, Cloudflare tunnel stable, seed `DEMO-SUP-001/DEMO-CUST-001/DEMO-ITEM-01/02` + warehouses, generate 1 matching PDF invoice, Profile+Vault + 1 manual PO Agent run, CLI scaffold only. Freeze the demo invoice literal as the shared test fixture.
Tomorrow 2hr live: 0-30 Hono+SQLite+upload (red-green on seam A), 30-70 TinyFish wrapper+PO live (red-green on seam B single step), 70-100 SO+Stock+SSE (extend B), 100-120 Q&A+memory (B+C) + rehearsal.
