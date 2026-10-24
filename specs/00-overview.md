# erp-fish — Spec Overview

## Problem Statement
Managers using slow ERP systems (ERPNext v16 self-hosted) waste expensive hours waiting for forms to submit and dynamic options to load. Creating a Buy Order, its Sale Order, and related Inventory transfers from an invoice is boring, repetitive, and blocks high-value work.

## Solution
A Bun monorepo (Next.js web + Hono API) where the user:
1. Connects ERPNext once via TinyFish Browser Context Profile + Vault.
2. Uploads 1 invoice PDF + instruction.
3. Agent controls TinyFish cloud browser, opens ERPNext via Cloudflare Tunnel, creates Purchase Order -> Sales Order -> Stock Entry.
4. Agent asks questions when doubtful, memorizes QnA per ERP host, stops asking over time.
5. User leaves for meeting, returns to verified order IDs + time-saved counter.

Demo scope: single invoice live on dev machine only, to save TinyFish wallet cost.

## Non-goals
- No batch-10 parallel for live demo (UI batch-ready, run single).
- No Frappe REST shortcut — all writes via TinyFish browser for judging centrality.
- No multi-user auth, no Postgres/Redis, no VPS hosting.

## Locked decisions
- Monorepo: Bun workspaces, CLI-init only (`bun init`, `create-hono`, `create-next-app`). Never hand-write `package.json`.
- Frontend: `apps/web` Next.js. Backend: `apps/api` Hono + `hc` RPC typesafety.
- ERP: ERPNext v16 local Docker + Cloudflare Tunnel stable HTTPS + seeded masters.
- LLM parse: OpenAI-compat (`OPENAI_BASE_URL/KEY/MODEL`), default opencode go free models.
- TinyFish: Agent `run-async` + `run-sse`, `use_profile:true + use_vault:true + stealth`.
- Memory: `(erp_host, q_norm) -> answer`.
- Idempotency: check-then-create by `supplier + invoice_no`.
