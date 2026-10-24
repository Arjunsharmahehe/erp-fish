# TinyFish Integration (judging-critical)

Must name all four on stage. No Frappe REST writes.

## 1. Browser Context Profiles (login persistence)
- Tonight: `POST /v1/profiles {name:"ERPNext Demo", set_as_default:true}` -> `POST /v1/profiles/:id/setup-session {url:"<tunnel>/app/login"}` -> connect Playwright via `cdp_url`, login manually, `POST /v1/profiles/:id/save {session_id}`.
- Reuse: every Agent call sends `use_profile:true, profile_id:<id>`.
- Why: avoids cold login each run, survives slow ERP login spinner.

## 2. Vault (stale-session repair)
- Add ERPNext creds in TinyFish dashboard Vault.
- Every run sends `use_vault:true`. If profile stale and login form appears, TinyFish repairs session and refreshes profile.
- UI shows `Vault: connected`. DB never stores passwords.

## 3. Agent API (action)
- SDK: `@tiny-fish/sdk` (TS) `client.agent.stream` / `run-async`.
- Per-doctype goals, example PO:
  > "On <tunnel>/app/purchase-order, search PO by invoice_no {X} for supplier {Y}. If exists return its ID. Else create PO: supplier {Y}, items [{name,qty,rate} mapped via memory {...}], warehouse {...}. Handle slow dynamic dropdowns with explicit waits. Return JSON {purchase_order_id}."
- Params: `browser_profile:stealth`, `proxy_config` default (same exit IP), `output_schema:{purchase_order_id:string}` etc.
- Chain: PO -> SO (`/app/sales-order`, customer mapped) -> Stock Entry (`/app/stock-entry`, material transfer). Pass prior IDs into next goal.
- Live: `run-sse` proxied to Next.js SSE view. `run-async` polling as fallback if SSE drops.

## 4. Search / Fetch (free tier, docs assist)
- Use Fetch to pull ERPNext help for field labels when goal fails on unknown field.
- Use Search only if supplier/item ambiguous and memory miss — cite source in question prompt.
- Keeps all web access via TinyFish, not raw fetch.

## Cost control (single invoice)
- Live demo runs 3 steps x ~1-3 min. Pre-check wallet balance. Cache one successful triple (IDs + screenshots) tonight as unshown insurance; primary stays all-live per your call.
- Timeouts: HTTP client 60s+ for session create, Agent poll 5min max per step.

## Failure modes
- Slow dropdown -> goal must say "wait for options, retry 3x".
- Tunnel churn -> freeze Cloudflare domain tonight, never restart tunnel live.
- CAPTCHA/MFA -> out of scope; seeded local ERPNext has none.
