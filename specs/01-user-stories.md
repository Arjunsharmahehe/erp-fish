# User Stories

1. As a manager, I want to connect my ERPNext URL once via TinyFish Profile+Vault, so that I never paste passwords per run.
2. As a manager, I want to see Vault connection status in UI, so that I trust stale-session repair works.
3. As a manager, I want to upload a single invoice PDF, so that demo stays cheap.
4. As a manager, I want to paste JSON manually as fallback, so that LLM parse failure never blocks demo.
5. As a manager, I want to type a free-text instruction, so that I control PO/SO/Stock scope.
6. As a manager, I want invoice parsed to Zod-validated JSON `{supplier, invoice_no, items[{name,qty,rate}]}`, so that bad extraction is caught early.
7. As a manager, I want one Autopilot Job to create PO->SO->Stock Entry, so that I upload and leave.
8. As a manager, I want check-then-create (search by invoice_no first), so that retries never duplicate orders.
9. As a manager, I want live SSE progress log, so that I see what the browser is doing.
10. As a manager, I want returned `{purchase_order_id, sales_order_id, stock_entry_id}`, so that I can verify in ERPNext.
11. As a manager, I want to be asked explicit questions when agent is doubtful (supplier/item map, warehouse, taxes), so that it never guesses.
12. As a manager, I want my answers memorized per ERP host, so that repeat invoices ask zero questions.
13. As a manager, I want to see learned memory count, so that learning story is visible to judges.
14. As a manager, I want time-saved counter (manual spinner time vs agent), so that value is obvious.
15. As a developer, I want Hono RPC `hc<AppType>` typesafety, so that web/api never drift.
16. As a developer, I want pluggable `OPENAI_BASE_URL/MODEL/KEY`, so that anyone can bring opencode go or other endpoint dev-side.
17. As a developer, I want SQLite + in-memory orchestrator, so that 2hr live build has no Redis dependency.
18. As a developer, I want Cloudflare Tunnel stable URL, so that Profiles stay valid across runs.
