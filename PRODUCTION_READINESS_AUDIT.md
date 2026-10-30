# Production Readiness Audit — Soccer Circular / SOFWAN

**Audit date:** 2026-10-29
**Scope:** full repository — Express API, React SPA, PostgreSQL/Supabase schema, Stripe billing, deployment configuration
**Method:** static review of routes, middleware, migrations, client API layer and deploy configs; `tsc` and Vitest baseline runs
**Baseline state at audit time:** TypeScript compiles clean (`tsc --noEmit` exit 0). Vitest: 126 of 127 tests pass, 1 pre-existing failure in `client/components/FinancialTransactionsManager.navigation.spec.tsx:128`. No code was changed during the audit.

> **Schema caveat:** findings that reference "migrations" were verified against `supabase/migrations/`. The production database may have drifted (columns added by hand). Run the reconciliation query in §9 against production before implementing schema fixes.

---

## 1. Executive summary

The application is feature-rich but is **not production-safe in its current state**. The issues cluster into five themes, and each maps to one of the errors clients are reporting:

| Theme | Representative defect | Client-visible symptom |
|---|---|---|
| Billing is not actually wired end-to-end | Cancel updates the local table but never calls Stripe | "I cancelled and was still charged" |
| Entitlements can be bypassed | No active subscription silently falls back to Pro limits | Revenue leakage, inconsistent plan limits |
| Data layer is fragile under load | Pool size 1, 2 s idle timeout, per-query logging | Random 500s, request timeouts, "stuck" pages |
| Schema drift | Bulk import inserts columns no migration creates | Bulk upload always fails |
| RBAC has holes and dead roles | Academy object returns `password_hash`; staff cannot log in | Security exposure, support tickets about missing staff access |

**Counts:** 9 Critical, 18 High, 17 Medium, 12 Low.

**Recommendation:** do not add new features until the nine Critical items are closed. A realistic Phase 1 (Critical only) is 5–8 engineering days; Phase 2 (High) another 2 weeks.

---

## 2. Severity legend

| Level | Meaning |
|---|---|
| **Critical** | Causes data loss, revenue loss, security exposure, or a core workflow that cannot succeed. Must fix before the next production deploy. |
| **High** | Breaks a workflow for a subset of users, or creates a credible security/integrity risk. Fix within 2 weeks. |
| **Medium** | Degrades reliability, maintainability or operability. Fix within 30–60 days. |
| **Low** | Hygiene, clarity, dead code, minor UX. Batch into routine cleanup. |

---

## 3. Critical findings

### C-1. Subscription cancellation never reaches Stripe
**Evidence:** `server/routes/subscription-management.ts:807-881` — `handleCancelSubscription` only runs
`UPDATE ... SET auto_renew = false` (line 854) and writes a history row. There is no lookup of `stripe_subscription_id` and no `stripe.subscriptions.update(...)`. The client calls this exact endpoint (`client/pages/AcademyDashboard.tsx:611`, `client/lib/api.ts:1776`).

**Impact:** The API and UI both report "Subscription cancelled successfully", but Stripe keeps billing the customer every cycle. This is the most likely source of chargebacks and refund requests.

**Fix:** Load `stripe_subscription_id` from `academy_subscriptions` / `agency_subscriptions`; call `stripe.subscriptions.update(id, { cancel_at_period_end: true })` **before** committing the local update. If the Stripe call fails, do not mark cancelled. Reuse the already-correct implementation in `server/routes/stripe-payments.ts:438-505` (but move the Stripe call outside the DB transaction).

### C-2. Webhook resurrects cancelled subscriptions
**Evidence:** `server/routes/stripe-webhooks.ts:279` — `handlePaymentSucceeded` calls `updateLocalSubscriptionFromStripe(..., cancel_at_period_end: false)`. Lines 189 and 500-520 read the real value correctly, but the payment-succeeded path hard-codes `false` and typically sets `auto_renew = true`.

**Impact:** Even when a cancellation does reach Stripe, the next successful invoice flips the local record back to auto-renew. Combined with C-1, cancellation is effectively impossible.

**Fix:** Pass through `stripeSubscription.cancel_at_period_end` and `cancel_at` from the event; never hard-code. Add an event-ordering guard (`stripe_event_created` timestamp) so stale events cannot overwrite newer state.

### C-3. Database pool is size 1 in every environment
**Evidence:** `server/lib/db.ts:125` — `max: parseInt(process.env.DB_POOL_MAX || '1')`; idle timeout 2 s (`:127`); every `query()` acquires and releases a client and writes three `console.log` lines (`:159-173`).

**Impact:** On the long-running target (`server/node-build.ts`), all queries in the process are serialised. One slow query blocks every request; under any concurrency the 5 s connect timeout produces 500s. Combined with `allowExitOnIdle` and a 2 s idle timeout, the pool is constantly reconnecting. This is the single best explanation for "the site randomly errors".

**Fix:** Set `DB_POOL_MAX` to 10–20 for the long-running server and keep `1` only for serverless via a `isServerless` flag. Raise `idleTimeoutMillis` to 30 s. Remove the per-query console logs (use a debug flag). Add `statement_timeout` and `query_timeout`.

### C-4. Entitlement bypass: missing subscription grants Pro limits
**Evidence:** `server/routes/football-players.ts:105-150`. If no `ACTIVE`, unexpired subscription exists, the code loads the Pro Plan and applies *its* player limit instead of rejecting the request. A paid registration is created with status `PENDING` (`server/routes/football-auth.ts`), so a brand-new paying-free academy immediately lands in this branch.

Additionally, bulk import skips the limit entirely when `player_limit` is `NULL` (`football-players.ts:1604-1612`: `null !== -1` is true, `count > null` is false).

**Impact:** Academies that never paid — or whose subscription expired — can create players up to (and sometimes beyond) the Pro allowance. Direct revenue leakage and inconsistent limits that support cannot explain.

**Fix:** Treat "no active subscription" as `403` with an upgrade prompt. Treat `NULL` player limit as `0`, not unlimited. Enforce the same helper in single-create and bulk-import paths.

### C-5. Academy detail response leaks `password_hash`
**Evidence:** `server/routes/academy.ts:186` reads `SELECT * FROM academies`, and line 435 spreads the row into the JSON response (`...academy`). Route is `GET /api/academies/:id` with `authenticateToken` + `requireOrganizationParam` (`:468`).

**Impact:** Any authenticated staff member of an academy (and every platform admin) receives the academy admin's bcrypt hash. Hashes are crackable offline; credential reuse then compromises other systems. This violates the minimum bar for PII/credential handling.

**Fix:** Replace `SELECT *` with an explicit column list; never return `password_hash`, `stripe_customer_id`, or internal notes. Add a response DTO.

### C-6. Bulk import writes columns that do not exist
**Evidence:** `server/routes/football-players.ts:1656-1666` inserts `first_name`, `last_name`, `date_of_birth`, `email`, `phone`, `address`, `city`, `country`, `parent_name`, `parent_phone`, `parent_email`, `medical_info`, `emergency_contact`, `height`, `weight`, `notes` as plaintext columns. The `players` table created by migrations has only encrypted variants (`first_name_cipher`, `last_name_cipher`, `dob_cipher`, …) plus a small set of non-PII columns (`supabase/migrations/20251113224221_schema.sql:49-58`, `20251114010006_add_missing_player_fields.sql`).

**Impact:** On any database built from the migrations, bulk import fails for every row with `column "first_name" of relation "players" does not exist`. If production has hand-added plaintext columns, the import defeats the encryption design. Either way this is broken.

**Fix:** Rewrite the bulk insert to use the encryption helpers and the `*_cipher` columns, generate `nrc_hash`/`nrc_salt`, and perform it inside one transaction with per-row error capture. Remove the plaintext path.

### C-7. Unauthenticated public profiles return decrypted contact data
**Evidence:** `server/routes/individual-players.ts:751-830`. For academy players, the fallback branch decrypts and returns `contact_email` and `whatsapp_number` (`:817-818`) without authentication. For individual players, the handler returns the raw joined row with the comment "Filter out sensitive data if any" and no filtering (`:828-830`). The same pattern exists in `GET /public/by-slug/:slug` (`:839-904`). Router is mounted with no auth (`server/index.ts`).

**Impact:** Anyone with a player UUID can harvest phone numbers and emails, including minors' guardians' contact details. This is a reportable privacy exposure and a GDPR-class risk.

**Fix:** Introduce an explicit public DTO (name, position, age, club, photo, bio only). Never decrypt contact fields in a public endpoint. Gate full profiles behind an authenticated, authorised route.

### C-8. Passwordless student login endpoint exists
**Evidence:** `server/routes/auth.ts:231-272` — `handleStudentLogin` authenticates on student ID alone, with no password, and issues a 24 h JWT.

**Impact:** It is not currently mounted in `server/index.ts`, so it is not exploitable today. It is one line in the router away from a total authentication bypass for student accounts.

**Fix:** Delete the handler and the `StudentLoginRequest` shape. If a student login is needed, implement it with a password or one-time code.

### C-9. No rate limiting, no security headers, no global error handler
**Evidence:** `server/index.ts` mounts `cors`, body parsers and routers only. `package.json` contains no `helmet`, `express-rate-limit`, or equivalent. Login, forgot-password, registration and webhook verification all run unthrottled.

**Impact:** Credential stuffing and password-reset email flooding are trivial. `X-Powered-By` and Express stack traces are exposed on unhandled errors. There is no central error format, so the client sees inconsistent `{error}` / `{message}` shapes.

**Fix:** Add `helmet`, a rate limiter on `/api/auth/*`, `/api/football-auth/*`, `/api/individual-players/login` and `/register`, a request body size cap per route, and a terminal Express error handler that logs a request ID and returns JSON. Disable `x-powered-by`.

---

## 4. High findings

### H-1. `verify-email` can mint an academy-admin token from any JWT with a matching id
**Evidence:** `server/routes/football-auth.ts:489-551`. It verifies the token with the shared secret, does **not** check `purpose`/`audience`, looks up `academies WHERE id = decoded.id`, then signs a fresh `ACADEMY_ADMIN` token. The same secret signs admin, agency, and individual-player tokens.

**Impact:** Token confusion / privilege escalation if any id in another table ever equals an academy id (or if a token is crafted by any principal with a valid signature). Email is never actually verified, so the route's name is misleading.

**Fix:** Add `purpose: 'email-verification'` (or `aud: 'academy-verify'`) when issuing and verify it here. Store a one-time token hash server-side. Do not issue a role token from this endpoint; issue a normal login token only after the verification record is consumed.

### H-2. Academy sessions are 7 days and cannot be revoked
**Evidence:** `server/routes/football-auth.ts` login signs `{ expiresIn: '7d' }`; `server/middleware/auth.ts:23-62` trusts the role in the token and never re-checks the account. `is_active` is only checked at login.

**Impact:** Deactivated or deleted academies/staff retain full API access for up to a week. Role changes are ignored until expiry.

**Fix:** Short-lived access tokens (15–60 min) plus refresh tokens, or a `token_version`/`session_id` column checked on each request. At minimum, re-validate `is_active` for mutating routes.

### H-3. Password reset tokens are replayable; reset updates unrelated staff
**Evidence:** `server/routes/auth.ts:84-126` — the 30-minute JWT is not stored or invalidated; it can be replayed any number of times. Line 106 updates **every** `staff_users` row with the same email, not just the intended account. Reset tokens also carry no `aud`/`purpose` binding beyond a custom claim.

**Impact:** A leaked reset link can be reused; a shared email can silently change another user's password.

**Fix:** Store a hash of the reset token with `used_at`, require single use, invalidate all sessions after reset. Scope the staff update to the matching academy.

### H-4. Notifications cannot be delivered to academies, agencies or platform admins
**Evidence:** `supabase/migrations/20251113224225_notifications_schema.sql:26` — `user_notifications.user_id UUID NOT NULL REFERENCES staff_users(id)`. The notification creation route only resolves recipients from `staff_users` (`server/routes/notifications.ts:246-258`), while JWT ids for academies come from `academies.id` and for admins from `"Admin".id`.

**Impact:** The notification bell is permanently empty for academy, agency and platform-admin accounts; admin broadcasts silently reach nobody. Notifications also fail hard at the FK if an academy id is passed as a recipient.

**Fix:** Change `user_notifications.user_id` to a polymorphic `(user_type, user_id)` pair, or create a unified `app_users` view/table. Backfill and add an FK-free index. Alternatively create per-org notification rows keyed by academy id in a separate table.

### H-5. Staff role is unusable: no login, no dashboard access
**Evidence:** No route authenticates against `staff_users` (only `auth.ts:106` writes a hash there). `client/App.tsx:204` restricts `/academy-dashboard` to `["academy", "agency_admin"]`; `client/components/ProtectedRoute.tsx` redirects `staff` to `/`.

**Impact:** Every "staff" invitation is a dead end. The role exists in the enum (`supabase/migrations/20251113224221_schema.sql:31`), in `AppRole` (`server/middleware/auth.ts:6-13`), in tenant checks (`canAccessOrganizationForRequest`) and in notification recipients — but a staff member can never sign in.

**Fix:** Decide the model. If staff are real users, add a staff login (email + password against `staff_users`), issue `role: 'staff'` with `academyId`, and allow the dashboard with scoped permissions. If staff are just contacts, remove the role and every staff branch to avoid false security assumptions.

### H-6. Support ticket list excludes staff
**Evidence:** `server/routes/support.ts:39-43` filters non-admins with `created_by = user.id OR school_id = user.id`. For a `staff` token, `user.id` is a staff id, not an academy id (tenant access is correctly handled in `router.param('id')`, but not here).

**Impact:** Even if staff could log in, they would see an empty ticket list for their own academy.

**Fix:** Use `canAccessOrganizationForRequest` semantics: resolve the staff member's `academy_id` and filter `school_id = academy_id OR created_by = user.id`.

### H-7. Unknown `/api/*` routes return `index.html` with HTTP 200
**Evidence:** `server/node-build.ts:20-22` — `app.get("/{*splat}")` runs after API routes, so a missing API path or a typo falls through to the SPA file.

**Impact:** The client tries `res.json()` on HTML; users see `Unexpected token '<'` errors instead of a meaningful 404. Health checks and integrations cannot distinguish a missing endpoint from success.

**Fix:** Add an API 404 middleware before the SPA catch-all: `app.use('/api', (req,res) => res.status(404).json({error:'Not found'}))`. Keep the SPA fallback for non-API GETs only.

### H-8. Subdomain routing hijacks the whole site on Netlify and custom hosts
**Evidence:** `client/App.tsx:135-161`. Any hostname with ≥3 labels that is not `www`/`api`/localhost/`*.vercel.app` is treated as a player slug and the entire app renders `<PublicPlayerProfile slug={subdomain}/>`. `netlify.toml` confirms Netlify deployment, where the host is `<site>.netlify.app` (3 labels) — the app becomes a player profile lookup. The same happens for `app.soccercircular.com` or any custom subdomain.

**Impact:** Deployed on Netlify, the dashboard and marketing site are unreachable. On Vercel custom domains this only works by accident.

**Fix:** Replace host heuristics with explicit configuration: an allow-list of app hosts (`APP_HOSTS`) and a dedicated player-profile host pattern (`PLAYER_PROFILE_HOST`, e.g. `players.` prefix) or path-based routing (`/p/:slug`). Never infer tenancy from label count.

### H-9. Maintenance mode bypass uses the wrong storage key and is client-only
**Evidence:** `client/App.tsx:111` reads `localStorage.getItem('auth_session')`, but the session is stored under `ipims_auth_session` (`client/lib/auth.ts:4`). The bypass therefore never works. Maintenance is also enforced only in React; the API stays fully available, and unknown routes still return the SPA.

**Impact:** Admins are locked out of `/portal` and `/admin/login` during maintenance (only paths starting with `/admin` bypass, and `/admin` itself redirects). Meanwhile API clients and direct links continue to work.

**Fix:** Use `getSession()` from `client/lib/auth.ts`. Enforce maintenance on the server (middleware returning 503 for non-admin API traffic) and exempt `/admin/*`, `/api/auth/*`. Allow `/portal` and `/admin/login` through the client guard.

### H-10. CORS reflects arbitrary origins in non-production; production allow-list may be incomplete
**Evidence:** `server/index.ts:112-141` — in non-production, any origin is allowed with credentials. In production, allowed origins come from `CORS_ORIGINS`, `CLIENT_URL`, `VITE_APP_URL`, `VERCEL_URL`, plus same-host. There is no default for the Netlify domain.

**Impact:** Staging/test environments accept credentialed cross-origin calls. If `CORS_ORIGINS` is not set on the deployed host, the SPA cannot call the API at all — another likely "errors after deploy" source.

**Fix:** Require an explicit allow-list in every environment; log rejected origins. Document required `CORS_ORIGINS` per deployment.

### H-11. Missing required secrets in the local environment file
**Evidence:** `.env` (untracked, present on disk) defines `DATABASE_URL`, `DB_*`, `ENCRYPTION_KEY`, `RESEND_*`, `STRIPE_*`, `VITE_*` but **not** `JWT_SECRET`, `NRC_SALT`, `FIELD_ENCRYPTION_KEY`, or `CRON_SECRET`. Runtime guards require all four in production (`server/lib/jwt.ts:9-14`, `server/lib/identity-hash.ts`, `server/lib/field-encryption.ts`, `server/routes/financial-transactions.ts:962-968`).

**Impact:** If the deployment platform is missing any of these, login returns 503 "Authentication service temporarily unavailable", encryption throws, or the reminder cron always 401s. These exactly match some reported auth failures.

**Fix:** Add them to `.env.example` with descriptions, verify them in the deploy platform, and add a startup self-check that fails fast with a single clear error listing missing keys.

### H-12. Client HTTP layer has no timeout and no session-expiry redirect
**Evidence:** `client/lib/api.ts:298-373` — `fetch` is called without `AbortController`; on 401 the session is cleared but the user stays on the page (`:350-356`). `API_BASE` reads `VITE_API_BASE_URL` (`:233`) while a second client path reads `VITE_API_BASE` (`:1050`).

**Impact:** A hung backend leaves spinners indefinitely. An expired session produces a burst of failing requests instead of a clean redirect to login. The two env-var names mean one integration silently ignores configuration.

**Fix:** Wrap `fetch` with a 20 s abort timeout and `NetworkError` handling; on 401 redirect to the correct login route based on role; consolidate on one env variable and delete the other.

### H-13. Player card IDs can collide and NRC uniqueness is bypassed
**Evidence:** `server/routes/football-players.ts:179` uses `Math.random().toString(36).substr(2,6).toUpperCase()` against a `UNIQUE` six-character column (`schema.sql:51`), with no retry. Line 183 substitutes `missing:<uuid>` for absent NRC, and line 184 stores a constant `nrc_salt`.

**Impact:** Occasional 500s on player creation when a card id collides; every player without an NRC bypasses the intended national-ID uniqueness constraint; the stored salt does not identify the key actually used to hash, complicating future re-keying.

**Fix:** Use a cryptographically random id with a retry-on-unique-violation loop. Use `NULL` for absent NRC and enforce uniqueness only when present. Store the real salt/version identifier from the hashing helper.

### H-14. `academies.email` is not unique
**Evidence:** `supabase/migrations/20251113224221_schema.sql:11` — `email TEXT`, no `UNIQUE`. Registration checks for duplicates in application code (`football-auth.ts`), which is racy. Agency and individual tables use `UNIQUE` (`:35` pattern).

**Impact:** Concurrent registrations can create duplicate tenants with the same login email; `handleAcademyLogin` takes `LIMIT 1`, so one tenant may be unreachable or the wrong tenant may log in.

**Fix:** Add a case-insensitive unique index on `LOWER(email)` after de-duplication, and catch the unique violation in registration.

### H-15. Legacy `staff_users.role` enum lacks `'admin'`, but code inserts it
**Evidence:** `schema.sql:31` defines `user_role` as `('superadmin','academy_admin','head_coach','coach','trainer','staff')`. `server/routes/auth.ts:334` and `:394` default `role` to `"admin"` and insert it into `staff_users`.

**Impact:** Those handlers are unmounted today, but any future call or script that uses them fails with an invalid-enum error. It also signals the role model was never reconciled.

**Fix:** Decide the canonical role set. Either add `'admin'` to the enum or normalise to `academy_admin` at the boundary. Delete dead registration handlers.

### H-16. Public profile route leaks via `SELECT p.*`
**Evidence:** `individual-players.ts:756` and `:844` select all columns of `player_profiles`, then return the row unmodified (`:829-830`, `:905`). Depending on production columns, this can include `player_id`, internal notes, or contact fields.

**Impact:** Uncertain blast radius, but "return the whole row publicly" is unsafe by construction.

**Fix:** Always project an explicit public DTO; add a test asserting sensitive columns are absent.

### H-17. Legacy registration handlers accept a role from the request body
**Evidence:** `server/routes/auth.ts:334-393` (`handleRegisterStaff`) and `:394-470` (`handleRegisterSchool`) destructure `role = "admin"` from `req.body` and insert it into `staff_users`. Neither is mounted, but both are exported.

**Impact:** A future router mount turns this into privilege escalation (self-assigned `superadmin`/`admin`).

**Fix:** Delete the handlers or hard-code the role server-side.

### H-18. Build and deployment paths diverge; no CI gate
**Evidence:** three server entrypoints — `server/node-build.ts`, `api/server/index.ts` (Vercel), `netlify/functions/api.ts` (Netlify). `vercel.json` defines a cron for `/api/financial-transactions/reminders/process`; `node-build.ts:30-31` starts two in-process schedulers that never run on serverless. No CI config in the repo; `pnpm build` is not verified in a pipeline. `.dockerignore` excludes `server/`.

**Impact:** Reminder emails run on some targets and not others; a Docker build would omit the backend. Deployment regressions reach production unchecked.

**Fix:** Pick one primary target, document it, and make the others thin wrappers. Move scheduled work to a single mechanism (platform cron or a dedicated worker). Add CI running `typecheck`, `test`, and `build` on every PR.

---

## 5. Medium findings

| ID | Finding | Evidence | Impact | Fix |
|---|---|---|---|---|
| M-1 | All DB queries serialise through one connection and log 3 lines each | `server/lib/db.ts:125, 159-173` | Latency and log volume scale with request count | See C-3; make logging opt-in |
| M-2 | TLS certificate verification disabled for all production DB connections | `server/lib/db.ts:52-77` | MITM risk on DB traffic | Ship the Supabase CA bundle or use `sslmode=verify-full` |
| M-3 | `dotenv` with `override: true` loads local `.env` over platform env | `server/lib/db.ts:8-9` | A bundled `.env` silently overrides production config | Only load dotenv when `NODE_ENV !== 'production'` |
| M-4 | No statement or query timeout | `server/lib/db.ts:121-131` | One pathological query can pin the only connection | Set `statement_timeout` and pg `query_timeout` |
| M-5 | `/api/maintenance/check-db` exposes database name, server address, version and schema | `server/index.ts:228-274` | Reconnaissance aid for admins-only, but unnecessary in prod | Remove or gate behind superadmin + env flag |
| M-6 | Database backup/restore/optimize endpoints are destructive and unaudited | `server/routes/database.ts:386-394`; mounted for any `admin` | A compromised admin account can drop/restore data with no trail | Superadmin-only, confirmation token, audit log |
| M-7 | Superadmin can delete themselves or the last superadmin | `server/routes/auth.ts:551-583` | Platform lockout | Block self-delete and last-remaining-superadmin |
| M-8 | Student ID login dead code remains | `server/routes/auth.ts:231-272` | One mount away from auth bypass | Delete (also listed as C-8) |
| M-9 | Forgot-password returns 503 when email fails, but 200 otherwise | `server/routes/auth.ts:70-76` | Timing/status difference can confirm an account exists | Always return the generic 200; queue mail |
| M-10 | Notifications list swallows errors and returns success | `server/routes/notifications.ts:38-41` | Failures are invisible; users see an empty bell | Return 500 or a degraded flag; log with request id |
| M-11 | `individual-players` account deletion does not require a password | `server/routes/individual-players.ts:1166-1185` | A stolen token can permanently delete an account | Require password or re-auth for destructive actions |
| M-12 | Geography fields are shifted on registration: `city` → `district`, `country` → `province` | `server/routes/football-auth.ts:160-184` (academy insert) | Country stored in the province column; filtering/reporting by country is wrong | Map to the intended columns or rename columns to match the domain |
| M-13 | Custom upload folder path is sanitised but accepts arbitrary nesting | `server/routes/uploads.ts:33` | Low-risk storage clutter; no tenant prefix | Prefix by org id; restrict to a known folder set |
| M-14 | Vestigial offline sync posts to non-existent endpoints every 5 s | `client/lib/sync.ts:33-37` | Constant 404 noise; misleading offline-first UX | Remove sync service and Dexie dependency, or implement real endpoints |
| M-15 | Tests can connect to the production database | test setup calls real `query()`; only email init is skipped in `NODE_ENV=test` (`server/index.ts:96-100`) | A future destructive test can mutate production data | Use a dedicated test database/schema or mocks; fail if `DATABASE_URL` looks like prod |
| M-16 | One failing UI test checked in | `client/components/FinancialTransactionsManager.navigation.spec.tsx:128` | Erodes signal from CI | Fix assertion or the component it targets |
| M-17 | Client route `/portal` is blocked during maintenance for expired sessions | `client/App.tsx:147-153` | Admins cannot sign back in mid-maintenance | Exempt `/portal`, `/admin/login`, `/forgot-password` |

---

## 6. Low findings

| ID | Finding | Evidence |
|---|---|---|
| L-1 | Committed scratch/debug artifacts: `bash.exe.stackdump`, `handleCancelSubscription_fix.txt`, `check-schema.ts`, `check-subs.ts`, `list_plans_scratch.*`, `query/`, `mock-admin-data.json` | repo root |
| L-2 | Scripts contain default passwords: `admin123`, `academy123`, `TestPassword123!` | `scripts/create-superadmin.js:39`, `scripts/update-existing-academies.cjs:38`, `scripts/test-stripe-integration.js:12` |
| L-3 | Duplicate/competing DB drivers and auth libs: `pg` + `postgres` + `mysql2`, `bcrypt` + `bcryptjs`, `serverless-http` in deps and devDeps | `package.json` |
| L-4 | Two API base env vars (`VITE_API_BASE_URL`, `VITE_API_BASE`) | `client/lib/api.ts:233, 1050` |
| L-5 | `netlify.toml` disables secret scanning for `.env` paths | `netlify.toml` |
| L-6 | `.dockerignore` excludes `server/` and has unrelated entries | `.dockerignore` |
| L-7 | Graceful shutdown exits before closing server/pool | `server/node-build.ts:34-42` |
| L-8 | No `X-Powered-By` disable, no request IDs, no structured logging | `server/index.ts` |
| L-9 | `getAcademiesIdType` introspects information_schema at runtime | `server/routes/football-auth.ts:10-20` — signals unresolved schema typing |
| L-10 | No migration runner in `package.json` (only ad-hoc `migrate:*` scripts) | `package.json:13-27` |
| L-11 | `README`/docs describe a different starter ("Fusion Starter", schools) | `AGENTS.md`, `README.md` |
| L-12 | Mixed naming (`academy` vs `school`, `staff` vs `admin`) across API, schema and UI | throughout |

---

## 7. Broken workflows (symptom → root cause)

| # | What a client experiences | Root cause | Where |
|---|---|---|---|
| 1 | "I cancelled but was charged again" | Cancellation never reaches Stripe; webhook resets auto-renew | C-1, C-2 |
| 2 | "Paid plan didn't apply" / "I can add players without paying" | PENDING subscription falls back to Pro limits; NULL limit means unlimited | C-4 |
| 3 | "Bulk import fails for every row" | Insert targets non-existent plaintext columns | C-6 |
| 4 | "Pages randomly fail / spin forever" | DB pool of 1, 5 s connect timeout, no client timeout | C-3, H-12 |
| 5 | "Unexpected token '<' in console" | SPA catch-all answers unknown `/api/*` with HTML 200 | H-7 |
| 6 | "Notifications never show up" | `user_notifications` FK only permits staff users | H-4 |
| 7 | "Staff can't log in" | No staff auth route; dashboard excludes staff | H-5 |
| 8 | "The whole site shows a player profile" | Any 3-label host is treated as a player slug | H-8 |
| 9 | "Logged out in the middle of work" | 24 h/7 d tokens, no refresh, 401 clears session without redirect | H-2, H-12 |
| 10 | "Login says authentication unavailable" | Missing `JWT_SECRET` on the deployment | H-11 |
| 11 | "Public player page shows my phone number" | Public endpoint decrypts and returns contact fields | C-7 |
| 12 | "Tickets are missing" | Staff ticket list filters by staff id, not academy id | H-6 |
| 13 | "Maintenance mode locks me out" | Bypass reads wrong localStorage key; portal blocked | H-9 |
| 14 | "Reminder emails don't send on Vercel" | Schedulers only start in the long-running entrypoint | H-18 |
| 15 | "Some API changes don't take effect" | Local `.env` overrides platform env | M-3 |

---

## 8. Role-based access assessment

### 8.1 Current role model

| Role | Issued by | Tenant scope mechanism | Can sign in? | Dashboard |
|---|---|---|---|---|
| `superadmin` | `POST /api/auth/login` (`"Admin"` table) | Global | Yes | `/admin` |
| `admin` | `POST /api/auth/login` | Global | Yes | `/admin` |
| `academy` (JWT `ACADEMY_ADMIN`) | `/api/football-auth/academy/login` | `user.id === academyId` | Yes | `/academy-dashboard` |
| `agency_admin` | `/api/football-auth/agency/login` | `user.id === agencyId` | Yes | `/academy-dashboard` |
| `individual_player` | `/api/individual-players/login` | `user.id === playerId` | Yes | `/player/dashboard` |
| `staff` | **none** | `staff_users.academy_id` lookup | **No** | **Forbidden** |
| `student` | dead handler only | none | Dead code | none |

### 8.2 Structural problems

1. **Two parallel identity systems.** Platform staff live in `"Admin"`; tenant staff in `staff_users`; academy admins in `academies`; agencies in `agencies`; players in `individual_players`. There is no `users` table and no shared token claims (`sub`, `aud`, `org_id`, `org_type`). Every route re-derives identity from `id` alone.
2. **Authorisation by id equality.** `canAccessOrganization` (`server/middleware/auth.ts:80-84`) grants access whenever `user.id === organizationId`, regardless of role or org type. It happens to be safe only because UUIDs across tables do not collide; it is not a designed invariant.
3. **No resource-type check.** An agency token and an academy token have the same shape. Any route that looks up by id without checking role type relies on a 404 to save it. This is fragile.
4. **Roles are not validated against the database.** `authenticateToken` accepts any signed role for the token's lifetime. Deactivation, deletion, and role changes have no effect until expiry.
5. **Front-end and back-end role lists disagree.** `client/App.tsx` permits only `academy`/`agency_admin` on the tenant dashboard; `AppRole` includes `staff`; the database enum uses `academy_admin`. Nothing tests the mapping.
6. **Client-side-only protection.** `ProtectedRoute` is a UX guard. Actual enforcement lives per-router and is inconsistent (some routers use `router.use`, others guard each route, one trusts mount-level middleware).

### 8.3 Recommended target model

- One `users` table (or a `user_accounts` view) with `id`, `email` (unique, case-insensitive), `password_hash`, `role`, `organization_id`, `organization_type`, `is_active`, `token_version`.
- Token claims: `sub`, `role`, `org_id`, `org_type`, `ver`, `aud = 'api'`, short expiry. Middleware validates `ver` against the row and rejects inactive accounts.
- Replace `user.id === orgId` with an explicit membership check:
  `canAccess(user, { orgType, orgId })` → admin bypass, or `user.org_type === orgType && user.org_id === orgId`.
- Centralise route guards: mount `router.use(authenticateToken)` at the top of every business router, then apply `requireRole` / `requireOrg` per route. Add tests for every role × route pair.

---

## 9. Data integrity and schema drift

### 9.1 Drift confirmed in code

| Code writes | Migrations define | Consequence |
|---|---|---|
| `players.agency_id` (`football-players.ts:196`) | No such column (only `academy_id`, added in `20251114010001`) | Agency player creation fails on a migrated DB |
| `players.first_name/last_name/date_of_birth/...` plaintext (`:1656-1666`) | Only `*_cipher` columns; `nrc_hash` and `nrc_salt` are `NOT NULL` | Bulk import fails; encryption bypass if columns were hand-added |
| `staff_users.role = 'admin'` (`auth.ts:334, 394`) | Enum lacks `'admin'` | Insert error |
| `user_notifications.user_id = academy/admin id` | FK → `staff_users(id)` | FK violation / no notifications |
| `academies.email` duplicated | No unique constraint | Duplicate tenants |

### 9.2 Additional integrity issues

- `nrc_hash UNIQUE NOT NULL` is satisfied with `missing:<uuid>` for players without an NRC, so the uniqueness guarantee is meaningless.
- `nrc_salt NOT NULL` stores a constant label, not the salt/version actually used.
- Card IDs are six random base-36 characters with no collision retry.
- `player_limit` can be `NULL` and is interpreted as unlimited in bulk import.
- `staff_users.role` enum does not cover the roles the code uses (`admin`, `academy`, `agency_admin`, `individual_player`).
- Several tables keep both encrypted and plaintext contact fields (e.g. `contact_email`, `whatsapp_number`), with no documented policy for which is authoritative.

### 9.3 Reconciliation query (run against production, read-only)

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('players','academies','staff_users','agencies',
                     'individual_players','user_notifications',
                     'academy_subscriptions','agency_subscriptions')
ORDER BY table_name, ordinal_position;
```

Compare the output with `supabase/migrations/` before writing any migration; production is likely ahead of the repo in some tables and behind in others.

---

## 10. Payments and subscriptions

**Working correctly:**
- Stripe webhook signature verification uses the raw body (`server/routes/stripe-webhooks.ts:19-38`).
- Idempotency via `ON CONFLICT` on `stripe_invoice_id`, `stripe_payment_intent_id`, `stripe_session_id` and `pg_advisory_xact_lock`.
- Checkout amounts are loaded from `subscription_plans` server-side, not from the client (`individual-players.ts:141-161`).
- `/api/payments/verify-payment` checks session payment status and organisation access.
- `stripe-payments.ts:438-505` contains the correct cancellation logic.

**Broken or risky:**
1. Cancellation path never calls Stripe (C-1).
2. Payment-succeeded webhook resets cancellation (C-2).
3. Stripe API calls inside DB transactions (`stripe-payments.ts:438-505`) can leave Stripe and the DB inconsistent if either side fails after the other succeeds.
4. No reconciliation job between Stripe subscription state and local tables; drift is invisible until a customer complains.
5. Registration issues a token and marks the org `active` before payment; paid plans sit at `PENDING` but the entitlement fallback (C-4) grants access anyway.
6. Payment records hard-code `'USD'` rather than using the plan/Stripe currency (`subscription-management.ts:556-566`).
7. No webhook handler for `invoice.payment_action_required` or disputes/chargebacks.
8. Cash-payment approval flow exists but is not covered by tests.

**Recommended:** one `billing` service module that owns Stripe calls, writes an outbox row, and is the only writer of subscription state; a daily reconciliation job; and integration tests against Stripe test clocks.

---

## 11. Frontend architecture

- **Routing:** one 2856-line `AcademyDashboard.tsx`; all routes in `App.tsx`; role checks client-side only; subdomain heuristic is unsafe (H-8).
- **Data layer:** ad-hoc `fetch` wrappers in `client/lib/api.ts` with no timeout, no retry, no central error surface; two API base variables; 401 does not redirect.
- **State:** `localStorage` holds the access token and copies of `academy_data`, `agency_data`, `subscription_data`; role and tenancy are read from localStorage in places instead of the token.
- **Dead/vestigial code:** Dexie + `syncService` replays to endpoints that do not exist; `auth_session` key mismatch; offline-first claims in docs are not implemented.
- **UI error handling:** many pages render empty states on failed requests rather than an actionable error, which matches "clients report errors but nothing tells them why".
- **Bundle/maintainability:** mixed component patterns, duplicated dashboard logic for academy vs agency, deep prop drilling around profile tabs.

**Priority:** consolidate auth/session access behind one hook; centralise API errors and toasts; split `AcademyDashboard` by tab; remove the offline sync layer; replace host-based tenancy with explicit routing.

---

## 12. Deployment and configuration

| Concern | Current state | Required |
|---|---|---|
| Targets | Long-running (`node-build.ts`), Vercel (`api/server/index.ts`), Netlify (`netlify/functions/api.ts`) | Pick one primary; keep others as wrappers |
| Cron | Vercel cron for financial reminders; two in-process schedulers elsewhere | One scheduler mechanism, idempotent, secret-protected |
| Env vars | `JWT_SECRET`, `NRC_SALT`, `FIELD_ENCRYPTION_KEY`, `CRON_SECRET` absent from local `.env`; not documented in `.env.example` | Document + startup validation |
| CORS | Reflective in dev; explicit list in prod | Explicit everywhere |
| Secrets in repo | Scripts with default passwords; `.env` files untracked but present | Rotate defaults, remove dead scripts |
| Health checks | `/ping` only | Add `/healthz` that checks DB and reports version |
| Observability | `console.*` only, no request ids, no error tracker | Structured logs + Sentry (or equivalent) |
| Migrations | Manual SQL files, no runner | Migrate on deploy with a recorded version table |
| CI | None | typecheck + tests + build on every PR |
| Backups | Admin UI can trigger backup/restore, no schedule documented | Automated daily backups + tested restore |

---

## 13. What is already solid

- JWT secret policy fails closed in production and refuses short secrets (`server/lib/jwt.ts`).
- SQL is parameterised throughout the reviewed routes; no string-concatenated user input was found in queries (dynamic table/column names are chosen from constants).
- RLS is enabled and anon/authenticated grants are revoked in `20260802133015_harden_auth_storage_and_rls.sql`; server access uses the service role, which is the correct architecture for this app.
- Player PII uses AES-256-GCM field encryption with purpose-bound keys and HMAC for NRC (`server/lib/field-encryption.ts`, `identity-hash.ts`).
- Stripe webhook signature verification and idempotency are implemented correctly.
- Tenant checks exist on financial, invoice, training, compliance, document, subscription and payment routes; the pattern is reusable — it just needs to be universal and centralised.
- TypeScript is clean and 126/127 tests pass, which is a workable base for adding regression tests.

---

## 14. Remediation plan

### Phase 1 — Critical (target: 5–8 engineering days)

**Status (2026-10-30): implemented** (see the Phase 1 fix commits).

1. Fix cancellation → Stripe, and stop the webhook from resetting it (C-1, C-2).
2. Fix entitlements: no active subscription = 403; NULL limit = 0 (C-4).
3. Remove `password_hash` from academy responses (C-5).
4. Replace bulk import with encrypted-column writes in a transaction (C-6).
5. Lock down public profiles with explicit DTOs (C-7).
6. Delete passwordless student login (C-8).
7. Pool sizing + timeouts + remove per-query logs (C-3).
8. Add helmet, rate limits, and a JSON error handler (C-9).
9. Verify and document all required env secrets on the deployment (H-11).
10. Add an API 404 handler before the SPA fallback (H-7) and fix subdomain routing (H-8).

**Exit criteria:** a customer can cancel and see it in Stripe; a free account cannot add players; bulk import succeeds; no endpoint returns a password hash; public profiles do not expose contact data; load test at 50 concurrent requests has no 5xx.

### Phase 2 — High (target: 2 weeks)

**Status (2026-10-30): implemented.** Token versioning (`token_version` + `tv` claim), one-time hashed verification/reset tokens (`server/lib/auth-tokens.ts`), polymorphic notification recipients (`user_type`), staff login (`/api/football-auth/staff/login`), server-side maintenance mode, strict CORS allow-list, optional NRC, case-insensitive academy email uniqueness, CI, and regression tests (169 passing). Migration: `20261031000000_phase2_security_hardening.sql`.

- Consolidate auth: single login surface, short tokens, revocation/version check, scoped claims, fix `verify-email` (H-1, H-2, H-3).
- Fix notification recipient model (H-4).
- Decide and implement the staff role, or remove it (H-5, H-6).
- Fix maintenance mode, CORS, client timeouts/redirects (H-9, H-10, H-12).
- Fix card id/NRC handling and add DB uniqueness for academy email (H-13, H-14).
- Remove the remaining dead registration handlers (H-15, H-17).
- Add regression tests for every fix above.

### Phase 3 — Architecture (60–90 days)
- Introduce a `users` table (or view) and a single `authorize(user, resource)` helper; test the full role × route matrix.
- Migrate schema drift into versioned migrations with a runner; add the reconciliation query to CI.
- Split the dashboard, remove Dexie/offline sync, consolidate the API client.
- Introduce structured logging, request IDs, error tracking, `/healthz`.
- Add Stripe reconciliation job, dispute handling, and billing integration tests.
- Pick one deployment target and document operations (backups, restore drill, rollback).

---

## 15. Production readiness checklist

**Security**
- [ ] No password hashes or internal fields in any response
- [ ] Public endpoints return explicit DTOs only
- [ ] Rate limiting on all auth/registration/password-reset routes
- [ ] Security headers enabled; `x-powered-by` disabled
- [ ] `JWT_SECRET`, `NRC_SALT`, `FIELD_ENCRYPTION_KEY`, `CRON_SECRET` set and documented
- [ ] Token expiry ≤ 1 h access + refresh, or version-based revocation
- [ ] Deactivated accounts lose access immediately
- [ ] Role × route authorisation tests exist and pass

**Data**
- [ ] Migrations are the single source of truth; production schema reconciled
- [ ] `academies.email` unique (case-insensitive)
- [ ] Bulk import writes only existing encrypted columns
- [ ] `user_notifications` supports all account types
- [ ] Card id collision retry; NRC uniqueness meaningful
- [ ] Backups automated and a restore has been rehearsed

**Billing**
- [ ] Cancel updates Stripe and local state atomically
- [ ] Webhooks preserve cancellation and ignore stale events
- [ ] No entitlement without an ACTIVE, unexpired subscription
- [ ] Daily reconciliation between Stripe and local subscriptions
- [ ] Refund/chargeback procedure documented

**Reliability**
- [ ] Pool sized for the deployment target; timeouts configured
- [ ] Client requests time out and surface actionable errors
- [ ] Unknown API routes return JSON 404
- [ ] Maintenance mode enforced server-side with an admin bypass
- [ ] `/healthz` reports DB connectivity
- [ ] Load test at expected concurrency passes

**Delivery**
- [ ] One documented primary deployment target
- [ ] CI runs typecheck, tests and build on every PR
- [ ] Full test suite green
- [ ] Alerting on 5xx rate, webhook failures and payment failures
- [ ] Rollback procedure documented

---

## 16. Suggested first pull request

A single focused PR that closes the highest-value, lowest-risk items and is easy to review:

1. `server/routes/subscription-management.ts` — call Stripe before local cancel.
2. `server/routes/stripe-webhooks.ts` — pass through `cancel_at_period_end`.
3. `server/routes/football-players.ts` — block player creation without an active subscription; NULL limit = 0.
4. `server/routes/academy.ts` — explicit column list in `handleGetAcademyById`.
5. `server/lib/db.ts` — pool sizing, timeouts, remove per-query logs.
6. `server/index.ts` — helmet, rate limiter, API 404, JSON error handler.
7. Tests for 1–4.

That PR alone removes the chargeback, entitlement and hash-exposure risks and materially stabilises request handling.
