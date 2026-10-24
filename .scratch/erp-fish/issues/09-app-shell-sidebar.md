# 09: App shell + route moves

**What to build:** `/home` sidebar app shell; existing pages relocated under
it; old top-level routes removed. Room to grow (jobs, future agent surface).

**Blocked by:** 08-auth-onboarding.

**Status:** open

**Seam:** None — manual verification only (layout + navigation).

**TDD loop:** No red-green cycle. Verify by behavior: sidebar navigates,
guards hold, old URLs redirect, no orphan pages.

- [ ] `/home/layout.tsx` sidebar shell (`Sidebar` + `SidebarProvider`,
  nav: Chat/Memory/Settings + recent-jobs slot); `VaultBadge` moves into
  shell header; follow
  https://ui.shadcn.com/docs/components/base/sidebar
- [ ] Move `/parse` handling into chat attachments (endpoint stays);
  move `/jobs/[id]` → `/home/jobs/[id]`; move `/memory` →
  `/home/memory` (CRUD upgrade itself is ticket 11); add `/home/settings`
  stub page (full form is ticket 11)
- [ ] Temporary redirects old → new; delete old files at ticket end; no
  dead links from landing/auth/onboarding
- [ ] shadcn rules: `ToggleGroup` for any option sets, `Skeleton` for
  loading placeholders, `Empty` for empty states, `Badge` for statuses —
  no hand-rolled equivalents
