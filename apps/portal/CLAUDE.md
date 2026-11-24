# CLAUDE.md: StemGrid Institute Portal (`apps/portal`)

The SaaS that member institutes use (`learn.stemgrid.in`) and the StemGrid team's console (`admin.stemgrid.in`), both served by this one Next.js app. The full spec is `PORTAL_BUILD_BRIEF.md` at the repo root; read it before changing behaviour. Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before using a Next API (see `AGENTS.md`).

**Prime directive:** this app never changes the services site, the simulator app or `packages/tokens`. Cookies are host-only (never pass a cookie `domain`).

**Shared Supabase project (owner decision, 25 Nov 2026, overriding brief §0/§1):** the portal uses the simulator's project `stemgrid` (ref `otynoieladqnxrhkfhfs`). Consequences:
- One migration history: portal migrations live in `apps/simulator/supabase/migrations/` (`20261126100000_portal_core.sql`, `20261126100100_reference_data.sql`); push from `apps/simulator`. Never grant/revoke on simulator tables or change project-wide defaults from a portal migration.
- One auth user pool: admins/teachers with an existing simulator account sign in with that password (activation and invites link the existing user, never overwrite the password). The simulator's `handle_new_user` trigger also gives portal users a `profiles` row; harmless.
- Project auth settings stay the simulator's (min password 8, sign-up on, JWT 1 h). Student passwords are `pinPassword(pin)` = `sgpin-<PIN>` so 6-digit PINs pass the minimum; the proxy's session check (not the JWT lifetime) ends old sessions.
- The console reads `institution_enquiries` with the portal's own service client (same project); `ENQUIRIES_*` env vars are optional overrides.
- Online payments are off unless the Razorpay keys are set (`paymentsEnabled()`): activation ends "awaiting payment" and staff use Record bank transfer.

## Commands

| | |
|---|---|
| `pnpm portal:local` (repo root) | Local testing: local Supabase (Docker) → `db reset` → demo data → `next dev` on :3002. See `TESTING.md` |
| `pnpm portal:reset` | Same, from a clean database |
| `pnpm dev:portal` / `pnpm build:portal` | Dev server / production build (build also type-checks) |
| `cd apps/portal && supabase test db` | RLS policy tests (`supabase/tests/rls_test.sql`) |

`predev`/`prebuild` run `scripts/copy-sim.mjs`, which copies the simulator engine (`engine.js`, `engine.d.ts`, `markup.js`, `styles.js`) into `src/simulator/engine/` and the module pictures into `public/assets/`. Both copies are gitignored: edit the simulator app, never the copies. `prebuild` also runs `scripts/guard-build.mjs`, which fails any production build with `PORTAL_MODE=local`, `PAYMENTS_PROVIDER=mock` or `ENQUIRIES_SOURCE=fixtures`.

Local env is generated into `.env.development.local` (read by `next dev` only, never by `next build`) by `scripts/local.mjs`. Production env: `.env.example`.

## Hosts and routing (`src/proxy.ts`)

- `admin.*` → everything is rewritten to the `src/app/console/` routes (`/login` → `/console/login`); staff only (`staff_users.active`) with TOTP (`aal2`; skipped in local mode). The request header `x-sg-console-base` is `''` there, or `/console` on plain `localhost:3002/console`; build console links with `consoleBase()`.
- `learn.*`: `/console` is a 404. Top-level pages: `/` (find your institute), `/activate/<token>`, `/privacy`, `/terms`, `/auth/confirm`. Everything else is `/<slug>/…`.
- `/<slug>/…`: unknown slug → `/?unknown=`; old slug (`slug_history`) → 308; status gates (before `paid` → `/<slug>/closed?why=not_open`; `lapsed`/`cancelled` → closed; `suspended` → students signed out, staff get `x-sg-readonly`); public sub-pages `login`, `join`, `invite`, `reset`, `help`, `closed`; everything else needs a signed-in active member of that institute whose JWT `session_id` equals `portal_users.current_session_id` (one session at a time), and the right role for `admin/`, `teacher/`, `student/`. Students are counted once per IST month (`record_active_student`, cookie `sg_m=<YYYY-MM>:<uid>`).
- `/api/*` authenticates itself (webhook signature, `CRON_SECRET`, invoice owner). `/dev/*` exists only in local mode.

Pages repeat the checks (`pageMember(slug, roles)`, `pageStaff()`); server actions use `requireMember(roles)` / `requireStaff()` and `assertWritable()`. Never trust an `institute_id` from the browser: derive it from the session.

## Data (`apps/simulator/supabase/migrations/20261126*`)

- RLS on every table. Portal users **read** through the API (policies in `apps/simulator/supabase/migrations/20261126100000_portal_core.sql`); they **write** only their own `student_projects` and thumbnails. All other writes are server code with the service-role key (`supabaseAdmin()`, `import 'server-only'`) after checking role and institute.
- Helpers: `portal_institute_id()`, `portal_role()`, `is_teacher_of(batch)`, `teaches_student(student)`, `in_batch(batch)`.
- Server-only SQL (service role): `student_limit`, `teacher_limit`, `record_active_student`, `assign_wave_place` (wave place + member number in one locked transaction; a place is taken only on payment), `next_invoice_number`.
- `institutes.status` changes only through `src/lib/lifecycle.ts` (`approveInstitute`, `recordPayment`, `scheduleTraining`, `goLive`/`markOnboardingComplete`, `pauseFreePeriod`, `endFreePeriod`, `startGrace`, `suspend`, `reactivate`, `lapse`, `cancelMembership`, `rejectInstitute`), each writing `activity_log`. A trigger (`institutes_status_guard`) refuses disallowed transitions.
- Prices live in `waves`, `plans`, `wave_prices` (seeded in `apps/simulator/supabase/migrations/20261126100100_reference_data.sql`). Never hardcode prices in UI code. Money is integer paise; show with `inr()`.
- `apps/portal/supabase/seed.sql` is local only (`dev_force_status` for the toolbar). Demo data: `scripts/seed-demo.mjs`. `scripts/local.mjs` copies the simulator's migration folder into the portal's local Supabase stack before `db reset`, so local mirrors the shared project.
- Students log in with `<username>@<institute_id>.students.invalid` + `pinPassword(PIN)`. Raise the project's sign-in rate limit before real classes: every student sign-in reaches Auth from the server's IP.

## Key modules (`src/lib/`)

`auth.ts` (session, `act()` action wrapper, `UserError`), `signin.ts` (one session at a time, student counting), `lifecycle.ts`, `pricing.ts`, `students.ts` (create single/CSV/self-join, PIN reset, rosters), `daily.ts` (the daily job), `invoices.ts` (GST split + PDF via pdf-lib), `payments/` (provider seam: Razorpay payment links or the local mock; `settle.ts` shared by webhook and mock), `enquiries.ts` (reads the simulator project's `institution_enquiries`; updates only `status`/`notes`), `mail.ts` (Resend, or the local mailbox), `clock.ts` (`now()`: use it instead of `new Date()` for anything business-related), `dates.ts` (IST months, financial year), `rules.ts` (slugs, usernames, PINs, join codes).

## Local testing mode

`PORTAL_MODE=local` **and** `NODE_ENV !== 'production'` (`isLocal()`). Fakes: enquiries from `dev/enquiries.json` (writes to `dev/.enquiries.local.json`), mock payments (`/dev/pay/<id>`), emails to `dev/.mailbox.json` (`/dev/mail`), pretend date in `dev/.state.json` (shared by both hosts and the daily job), staff TOTP skipped, dev toolbar (`src/dev/`). Every new feature ships with demo data, a toolbar shortcut if it depends on dates or status, and a step in `TESTING.md`.

## Simulator inside the portal

`src/simulator/PortalSimulatorHost.tsx` mirrors the simulator app's `SimulatorHost.tsx` lifecycle and autosave rules but saves to `student_projects` (+ private `student-thumbnails` bucket, path `<institute>/<owner>/<project>.webp`). No guest mode, drafts, `?claim` or `?demo`. Teachers/admins open students' builds read-only. The simulator's CSS is global and string-injected only while mounted; the dev toolbar uses inline styles for that reason.

## Conventions

Look: soft shadows, frosted glass, no hard outlines, red `#E3121B`, cream `#FFF3E0` (`src/ui/ui.module.css`). Fonts by name from Google Fonts (not `next/font`). Student-facing messages are friendly and plain. IST for months and dates shown; store UTC. Students: only display name, username, batches, activity and projects; never email, phone, birth date or photo.

## Not built yet (M2 / owner decisions)

AutoPay subscriptions, add-on purchases in the portal, assignments/submissions/grades/announcements, reports and CSV export, console `/usage`. Teacher accounts are unlimited during the free period (no plan yet) until the owner decides otherwise. Privacy policy and membership terms pages are placeholders.
