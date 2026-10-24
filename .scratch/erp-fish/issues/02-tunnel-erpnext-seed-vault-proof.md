# 02: Tunnel plus ERPNext seed plus Vault proof

**What to build:** ERPNext reachable by TinyFish cloud with demo masters ready and login persistence proven. One manual Agent run creates a Purchase Order so the live demo never depends on cold login.

**Blocked by:** None (can start immediately, parallel with 01).

**Status:** partial — infra-only done (no-keys loop 2026-10-24, commit `85aa714`); live proof blocked on keys + Docker daemon

## Progress (no-keys loop 2026-10-24)
- Done without keys: `infra/erpnext/` (compose pin `frappe/erpnext:v16.52.1`,
  bring-up README, seed env) + `infra/tunnel/` (README, cloudflared.yml) +
  `apps/api/scripts/seed-erpnext.ts` (idempotent check-then-create masters)
  + generated `apps/api/tests/fixtures/demo-invoice.pdf` (done under 03).
- NOT done (keyed phase): boot ERPNext + first-run seed (no Docker daemon on
  this box), stable tunnel URL, Profile + Vault proof, manual Agent PO run.
  See LOOP_LOG.md KEYED PHASE items 1–3.

**Seam:** None — manual verification only (real browser plus tunnel cannot be meaningfully unit-tested in 2hr).

**TDD loop:** No red-green cycle. Verify by behavior: tunnel URL loads externally and manual Agent run returns an order ID.

- [ ] Cloudflare Tunnel serves local ERPNext v16 on a frozen stable HTTPS URL
- [ ] Seeded supplier, customer, two items, and warehouses match the single demo invoice exactly
- [ ] Browser Context Profile saved plus Vault credential linked for that host
- [ ] One manual TinyFish Agent Purchase Order create succeeds and returns an order ID
