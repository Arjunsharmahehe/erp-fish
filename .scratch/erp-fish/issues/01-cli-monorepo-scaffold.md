# 01: CLI monorepo scaffold

**What to build:** A runnable Bun monorepo where web can call api with typesafe RPC. A fresh clone plus CLI installs plus env gets both dev servers up on the demo machine with a hello round-trip.

**Blocked by:** None (can start immediately).

**Status:** done (no-keys loop 2026-10-24, commit `f5f3650`)

**Seam:** None — manual verification only (protects 2hr budget, no automated seam).

**TDD loop:** No red-green cycle. Verify by behavior: both servers boot and hello round-trips.

- [ ] Root plus web (Next.js) plus api (Hono) plus shared schemas all created via CLIs only, workspaces link
- [ ] Web calls api hello through typesafe RPC client successfully
- [ ] Both dev servers run together on demo machine with documented env vars
