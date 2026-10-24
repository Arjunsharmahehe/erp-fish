# 11: Memory CRUD + settings

**What to build:** Memory page becomes full CRUD (edit/delete learned
answers); settings page edits connection + shows vault status.

**Blocked by:** 08-auth-onboarding, 09-app-shell-sidebar.

**Status:** open

**Seam:** None — manual verification only (forms over existing seam C
storage, already tested in 06).

**TDD loop:** No red-green cycle (storage covered by 06). Verify by
behavior: edit/delete round-trip in the browser, settings update takes
effect on the next job.

- [ ] `PUT /api/memory { erp_host, q_norm, answer }` (upsert path exists);
  `DELETE /api/memory?erp_host=&q_norm=` (new shared query schema)
- [ ] Memory UI: `Table` + `Dialog` edit + `AlertDialog` delete confirm;
  `Empty` state when no entries; scoped display per host
- [ ] Settings UI: `Tabs` (Connection/Account) + `Card` +
  `FieldGroup`/`Field`; `PATCH /api/auth/settings { erp_host?,
  profile_id? }`; vault status visible; password change explicitly
  deferred (noted, not built)
- [ ] Next job after a settings host change uses the new host (server
  fills from session — already ticket 08, verified here end to end)
