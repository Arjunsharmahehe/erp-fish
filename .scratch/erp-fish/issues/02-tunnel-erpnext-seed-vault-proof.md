# 02: Tunnel plus ERPNext seed plus Vault proof

**What to build:** ERPNext reachable by TinyFish cloud with demo masters ready and login persistence proven. One manual Agent run creates a Purchase Order so the live demo never depends on cold login.

**Blocked by:** None (can start immediately, parallel with 01).

**Status:** ready-for-agent

**Seam:** None — manual verification only (real browser plus tunnel cannot be meaningfully unit-tested in 2hr).

**TDD loop:** No red-green cycle. Verify by behavior: tunnel URL loads externally and manual Agent run returns an order ID.

- [ ] Cloudflare Tunnel serves local ERPNext v16 on a frozen stable HTTPS URL
- [ ] Seeded supplier, customer, two items, and warehouses match the single demo invoice exactly
- [ ] Browser Context Profile saved plus Vault credential linked for that host
- [ ] One manual TinyFish Agent Purchase Order create succeeds and returns an order ID
