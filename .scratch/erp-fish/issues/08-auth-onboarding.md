# 08: Auth + onboarding

**What to build:** Hand-rolled JWT auth and ERP onboarding gating the whole
app. Signup/login pages, httpOnly cookie session, Next middleware redirect
chain, onboarding wizard (host + credentials, passwords never persisted).

**Blocked by:** None (can start immediately; blocks 09/10/11).

**Status:** open

**Seam:** None — manual verification only (auth cookies + redirects, like 01).

**TDD loop:** No red-green cycle. Verify by behavior: full signup →
onboard → login → logout loop in the browser, passwords absent from SQLite.

- [ ] `users(id, email UNIQUE, password_hash, erp_host NULL, profile_id NULL,
  created_at)` in `openDb`; `JWT_SECRET` required env (fail-fast),
  `JWT_TTL_SECONDS` default constant
- [ ] `POST /api/auth/signup`, `POST /api/auth/login` (`Bun.password`,
  `hono/jwt`, set `erp_fish_session` httpOnly cookie),
  `POST /api/auth/logout` (clear), `GET /api/auth/me` (session user +
  vault status); CORS `credentials: true`
- [ ] `POST /api/onboarding { erp_host, erp_username?, erp_password? }` —
  stores host/profile on user row; credentials forwarded to Vault only when
  keys configured, never persisted
- [ ] `POST /api/jobs` + answer routes fill `erp_host`/`profile_id` from the
  session (ignore client values); `jobs.user_id` set on create, foreign
  rows 404
- [ ] `/login`, `/signup` pages (`FieldGroup` + `Field`); `/onboarding`
  `Questionnaire` wizard (host step, credentials step); `/` stays a static
  placeholder with CTAs (design later)
- [ ] Next middleware (`/home/:path*`, `/onboarding`): verify via
  `GET /api/auth/me` with forwarded cookie; unauth → `/login`, un-onboarded
  → `/onboarding`, onboarded on `/onboarding` → `/home`
- [ ] Shared: `SignupRequest/LoginRequest`, `SessionUser`,
  `OnboardingRequest` Zod schemas; no raw strings/numbers in routes
