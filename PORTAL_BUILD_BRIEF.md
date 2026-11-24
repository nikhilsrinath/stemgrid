# StemGrid Institute Portal: build brief for the coding agent

Read this whole file before writing code. Also read `CODEBASE.md`, `apps/simulator/CLAUDE.md` and `apps/simulator/AGENTS.md`. This brief adds a **new product** to the monorepo. It does not change how the existing sites, signups or the simulator work.

---

## 0. The prime directive: do not disturb what exists

> **Owner decision, 25 Nov 2026 (overrides rule 2 and the "Simulator Supabase project" row below):** the portal uses the simulator's existing Supabase project `stemgrid` instead of a new `stemgrid-portal` project. Portal migrations live in `apps/simulator/supabase/migrations/` and only add portal tables, functions, buckets and storage policies; the simulator's tables, grants and auth settings are not changed. Admins and teachers share the auth user pool with the simulator. Cookies stay host-only. Online payments are off until Razorpay keys are added. See `apps/portal/CLAUDE.md` and `apps/portal/DEPLOYMENT.md`.

The current products keep working exactly as they do today. Treat these as frozen:

| Frozen thing | Where | What "frozen" means |
|---|---|---|
| Services site | `apps/web` | No changes at all in this project |
| Simulator landing page | `apps/simulator/src/app/page.tsx`, `src/landing/*` | No changes. The membership section keeps showing advantages only, never prices |
| Free accounts | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding`, `/projects`, `/profile` | No changes to pages, server actions, `proxy.ts`, or redirect rules |
| Institution enquiry form | `/signup?as=institution`, `submitEnquiry`, `institution_enquiries` table | No changes to the form, the action, the table schema or its RLS. The portal **reads** this table from the server only (section 6) |
| Simulator engine and saving | `src/simulator/*`, `SimulatorHost.tsx`, `src/lib/projects.ts` | No behaviour change. The only allowed change is the mechanical engine extraction in section 9, done as its own PR |
| Simulator Supabase project | ref `otynoieladqnxrhkfhfs` | No new tables, no migration, no auth-config change, no new redirect URLs |
| Shared tokens | `packages/tokens` | Read-only. Don't edit existing tokens |

Rules that follow from this:

1. **Build the portal as a new app:** `apps/portal`. Never add portal routes to `apps/simulator`.
2. **Use a new, separate Supabase project** for the portal (name: `stemgrid-portal`, region ap-south-1). Portal users, institutes, batches and student work live only there. No shared auth, no shared users table.
3. **Never set a cookie on `.stemgrid.in`.** All cookies are host-only, so a login on `simulator.stemgrid.in` can never be seen by `learn.stemgrid.in`, and the other way round.
4. Before merging any PR, run the regression checklist in section 14. If anything in it changed, the PR is wrong.

---

## 1. What we are building and why

StemGrid sells a simulator subscription to institutes (academies, STEM centres, coaching centres, colleges, schools). Institutes join through a membership with 20 places: 10 **Founding Partners**, then 10 **Charter Members**. After joining, an institute gets an unlimited free period, then pays monthly at a locked member price, billed by **active students per month**.

The portal is the SaaS the institute uses: its admin creates batches and teachers, students join and use the simulator, teachers give assignments (later). StemGrid's own team uses a console to approve institutes, track payment and see usage.

### Products after this project

| Address | App | Who | Status |
|---|---|---|---|
| `stemgrid.in` | `apps/web` | Public | Exists, unchanged |
| `simulator.stemgrid.in` | `apps/simulator` | Public, free accounts, enquiry form | Exists, unchanged |
| `learn.stemgrid.in` | `apps/portal` | Institute admins, teachers, students | **New** |
| `admin.stemgrid.in` | `apps/portal` (console routes, host-gated) | StemGrid team only | **New** |

---

## 2. Business rules the software must enforce

These come from the membership terms. Money depends on them, so they are requirements, not suggestions. All prices exclude 18% GST. **Never hardcode prices in UI code:** read them from the `pricing` tables (section 5), seeded with these values.

### 2.1 Waves (joining)

| | Founding Partners | Charter Members |
|---|---|---|
| Places | First 10 paid institutes | Next 10 paid institutes |
| Pay to join (bundled) | ₹5,500 (first month ₹3,500 + onboarding ₹2,500, less ₹500 bundle saving) | ₹6,000 (first month ₹4,000 + onboarding ₹2,500, less ₹500) |
| Unlimited free period | 3 months total (1 paid + 2 free) | 2 months total (1 paid + 1 free) |
| Fair-use cap in free period | 300 active students | 300 active students |
| Price lock | 36 months after the free period, only while continuous | same |

A place is taken **only when payment is received**, never on approval. If a wave fills while someone is paying, they are offered the next wave or a full refund.

### 2.2 Plans after the free period (per month)

| Plan | Active students | Teacher accounts | Founding | Charter | Regular |
|---|---|---|---|---|---|
| Starter | 30 | 2 | ₹3,500 | ₹4,000 | ₹5,000 |
| Growth | 90 | 5 | ₹9,000 | ₹10,000 | ₹12,000 |
| Pro | 180 | 10 | ₹16,000 | ₹18,000 | ₹20,000 |
| Extra students, per pack of 10 | | | ₹1,600 | ₹1,800 | ₹2,000 |
| Extra teacher account | | | ₹500 | ₹500 | ₹500 |

### 2.3 Usage and billing rules

| Rule | Behaviour |
|---|---|
| Active student | A student counts **once per calendar month (IST)**, on their first successful portal sign-in or first authenticated request in that month. Removing or archiving them later never lowers that month's count |
| Limit during free period | 300 active students. The 301st new active student that month is blocked from signing in, with a friendly message telling them to ask their institute |
| Limit after free period | Plan limit + 10 × extra packs. Same blocking behaviour. Warn the institute admin at 80% and 100% |
| Teacher limit | Plan's teacher accounts + extra teacher accounts. Inviting beyond the limit is blocked in the UI and the server action |
| One session at a time | A new sign-in ends the user's other sessions (section 7.4) |
| Batches | **Unlimited.** No limit anywhere in DB or UI |
| Plan placement | During the last month of the free period, recommend the smallest plan whose limit ≥ the institute's peak monthly active students. Admin confirms within 7 days, or it is applied automatically. Admin can choose bigger, never smaller than usage |
| Minimum term | 3 paid months after the free period |
| Extra packs | Billed for the full current month when added. Removal and downgrades apply from the next billing date. No refunds for part months |
| Go-live | The free period starts at go-live = the day StemGrid marks onboarding complete, or 7 days after payment, whichever is first |
| Free period pause | Once only, max 30 days, set by StemGrid staff |
| Failed payment | 7-day grace: everything works, banner shown. Then **students blocked**, admin and teachers read-only |
| Lapse | 30 days after the due date → status `lapsed`, price lock ends permanently. Data kept 60 days, then personal data deleted (invoices kept) |

---

## 3. Lifecycle of an institute

```
[existing] enquiry submitted at simulator.stemgrid.in/signup?as=institution
      │   (institution_enquiries row, ref SG-XXXXXX — unchanged)
      ▼
console: staff reviews enquiry ──reject──► enquiry status set to 'lost' (or 'spam')
      │ approve (choose slug, confirm wave offered)
      ▼
institutes.status = 'approved'  → activation email with single-use link
      ▼
learn.stemgrid.in/activate/<token>
   admin verifies email (OTP), sets password, accepts membership terms (version stored),
   confirms parental-consent declaration, pays joining amount (Razorpay)
      ▼
payment webhook confirmed → status 'paid', wave place assigned, member number, invoice
      ▼
'onboarding'  (staff schedules training)
      ▼
go-live (staff marks onboarding complete, or day 7 after payment)
      ▼
'free_period' (unlimited, cap 300)  → last month: plan recommendation, AutoPay mandate
      ▼
'active' (billed monthly) ⇄ 'grace' (payment failed, 7 days) → 'suspended' → 'lapsed' (30 days)
                         └► 'cancelled' (by admin after minimum term, 30 days' notice)
```

### 3.1 Status values and allowed transitions

`approved → awaiting_payment → paid → onboarding → free_period → active`
`active → grace → active | suspended`
`suspended → active | lapsed`
`active → cancelled` (after minimum term)
`any → rejected` (before payment only)

**Status changes only happen through named server functions** (`approveInstitute`, `recordPayment`, `markOnboardingComplete`, `startGrace`, ...). Never update `institutes.status` directly from UI code. Every transition writes an `activity_log` row.

### 3.2 Why activation happens in the portal, not in the enquiry form

The enquiry form must not change. So the extra steps the membership needs (verified email, terms acceptance, consent declaration, payment) happen on the portal's activation page after StemGrid approves.

---

## 4. Tech stack for `apps/portal`

Match the simulator's versions so the monorepo stays consistent.

| Layer | Choice |
|---|---|
| Framework | Next.js **16.4.6**, App Router, Turbopack. Middleware is `src/proxy.ts` (exported `proxy`). Read `node_modules/next/dist/docs/` before using Next APIs |
| UI | React 19.3.1, Server Components + Server Actions, CSS Modules |
| DB / auth / storage | New Supabase project `stemgrid-portal`, `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2.x |
| Payments | Razorpay (payment links for joining in M1, Subscriptions + UPI AutoPay in M2). Wrap in `src/lib/payments/` so the provider can be swapped |
| Email | Resend HTTP API (same pattern as the enquiry notifications) |
| Scheduled jobs | One protected route `POST /api/cron/daily` called by the host's scheduler with `CRON_SECRET` |
| Language | TypeScript strict, path alias `@/*` → `src/*` |
| Port | `pnpm dev` on **3002** |
| Fonts | Same approach as the simulator: Google Fonts by name in `layout.tsx`, **not** `next/font` (the simulator engine draws "Poppins" onto canvases) |

Add root scripts without changing existing ones: `dev:portal`, `build:portal`. Update `pnpm dev` and `pnpm build` to include the portal **only if** that doesn't change how the other two run.

### 4.1 Look

Follow the simulator's account pages (soft shadows, frosted glass, no hard outlines), brand red `#E3121B`, cream `#FFF3E0`. Keep it plain and fast: this is a work tool for teachers. Each institute's sign-in page shows the institute's name and logo above StemGrid's.

---

## 5. Database (portal Supabase project)

All tables have RLS enabled. Use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` times, and `created_at` / `updated_at` on every table. Store money as integer **paise**.

### 5.1 Tables

| Table | Key columns | Notes |
|---|---|---|
| `institutes` | id, slug (citext unique), name, type, city, address, gst_number, contact_name, contact_email, contact_phone, logo_path, status (enum §3.1), wave_id, member_number (unique, nullable), enquiry_ref (text, the `SG-XXXXXX` from the simulator project), approved_at, paid_at, go_live_at, free_period_ends_at, free_period_paused_days, minimum_term_ends_at, lock_ends_at, terms_version_accepted, terms_accepted_at, consent_declared_at | Top-level tenant |
| `staff_users` | id (= auth uid), name, email, active | StemGrid team, console only |
| `portal_users` | id (= auth uid), institute_id, role (`institute_admin` \| `teacher` \| `student`), display_name, username (citext), status (`active` \| `archived`), current_session_id, last_login_at, created_by | Every portal account belongs to **exactly one** institute. Unique (institute_id, username) |
| `batches` | id, institute_id, name, course, schedule_text, starts_on, ends_on, join_code (unique, 6 chars), join_code_expires_at, status (`active` \| `archived`) | No count limit |
| `batch_teachers` | batch_id, teacher_id | PK (batch_id, teacher_id) |
| `batch_students` | batch_id, student_id, joined_at, removed_at | A student may be in several batches of the same institute |
| `monthly_active_students` | institute_id, month (date, first of month IST), student_id, first_seen_at | PK (institute_id, month, student_id). This **is** the usage count |
| `usage_months` | institute_id, month, active_count, limit_at_time, plan_code | Written by the daily job; history for the billing page |
| `waves` | id, code (`founding` \| `charter`), places, join_price_paise, free_months, sort | Seed per §2.1 |
| `plans` | code (`starter` \| `growth` \| `pro`), student_limit, teacher_limit, regular_price_paise | Seed per §2.2 |
| `wave_prices` | wave_id, plan_code, price_paise, extra_pack_paise, extra_teacher_paise | Seed per §2.2 |
| `subscriptions` | id, institute_id, plan_code, price_paise (locked), extra_packs, extra_teachers, billing_day, status, provider_subscription_id, mandate_status, current_period_start, current_period_end, recommended_plan_code, recommendation_due_at | One current row per institute |
| `payments` | id, institute_id, kind (`joining` \| `monthly` \| `addon`), amount_paise, gst_paise, provider, provider_payment_id (unique), status, paid_at, raw (jsonb) | Idempotent on provider_payment_id |
| `invoices` | id, institute_id, payment_id, number (unique, sequential per financial year), amount_paise, gst_paise, issued_at, pdf_path | GST invoice record |
| `activation_tokens` | token_hash, institute_id, email, expires_at, used_at | Single use, 7 days |
| `invites` | token_hash, institute_id, role, email, batch_id (nullable), expires_at, used_at, invited_by | Teacher and admin invites, single use, 7 days |
| `login_attempts` | institute_id, username, attempted_at, success | For the 5-fails-then-15-minutes lockout |
| `student_projects` | id, institute_id, owner_id, batch_id (nullable), name, data (jsonb, < 1 MB), thumbnail_path, module_count | Simulator saves inside the portal (section 9) |
| `assignments`, `submissions`, `grades`, `announcements` | as in section 10 | M2 |
| `activity_log` | id, institute_id (nullable for staff-only), actor_id, actor_kind (`staff` \| `portal`), action, target_type, target_id, before (jsonb), after (jsonb), at | Append-only |
| `reserved_slugs` | slug | Seed: admin, api, login, logout, join, invite, activate, reset, help, console, static, assets, _next, www, learn, app, support, billing |

### 5.2 RLS approach

Create `security definer` SQL helpers, used in every policy:

- `portal_institute_id()` → the caller's `institute_id` from `portal_users`.
- `portal_role()` → the caller's role.
- `is_teacher_of(batch_id)` → true if the caller teaches that batch.

Policies, in short:

- Every tenant table: rows visible only where `institute_id = portal_institute_id()`.
- Teachers: batches, students and assignments only for batches they teach.
- Students: their own `portal_users` row, their own `batch_students`, their own `student_projects` and submissions; assignments of batches they're in.
- `institutes`, `subscriptions`, `payments`, `invoices`: institute admin may **read** their own; nobody in the portal may write them through the API. Writes go through server code with the service-role key.
- `staff_users`, `activity_log`, `waves`, `plans`, `wave_prices`, `reserved_slugs`, tokens, `login_attempts`: no access through the API for portal users. Console server code uses the service-role key.

**Test:** sign in as a teacher at institute A and call the API for a batch, student, invoice and project of institute B. All must return nothing.

### 5.3 Storage buckets (private)

| Bucket | Path | Limit |
|---|---|---|
| `institute-logos` | `<institute_id>/logo.webp` | 1 MB, served via signed URL or public-read (logos only) |
| `student-thumbnails` | `<institute_id>/<owner_id>/<project_id>.webp` | 1 MB |
| `submissions` (M2) | `<institute_id>/<assignment_id>/<student_id>/<file>` | 10 MB, images and PDF only, private, signed URLs |
| `invoices` | `<institute_id>/<number>.pdf` | Private, signed URLs |

---

## 6. Reading the existing enquiries (without touching them)

The console needs the enquiries submitted through the existing form.

- Add **server-only** env vars to the portal: `ENQUIRIES_SUPABASE_URL` and `ENQUIRIES_SUPABASE_SERVICE_ROLE_KEY` (the simulator project's service-role key).
- Create `src/lib/enquiries.ts` (imports `server-only`) that **reads** `institution_enquiries` and may **update only** the existing `status` and `notes` columns, using values the table already allows (`new`, `contacted`, `meeting`, `proposal`, `won`, `lost`, `spam`).
- Mapping: on approval set `status = 'proposal'`, on payment `'won'`, on rejection `'lost'` (or `'spam'`). Append a short line to `notes`, such as `[console] approved as milton-international by <staff name>`.
- Never insert, delete or change the schema or policies of that table. Never expose that key to the browser.
- When approving, copy the needed details from the enquiry into a new `institutes` row in the portal project and store the `enquiry_ref`.

---

## 7. Authentication

### 7.1 Who signs in how

| Role | Sign-in | Created by |
|---|---|---|
| Staff | Email + password **and** TOTP (Supabase MFA, required) on `admin.stemgrid.in` | Seeded manually or by another staff member |
| Institute admin | Email + password (min 8). Email verified via the activation link | Activation flow |
| Teacher | Email + password (min 8) | Invite link from institute admin |
| Student | **Username + 6-digit PIN** on their institute's sign-in page | Institute admin or teacher (single or CSV), or self-join by batch code (§8.3) |

Phone OTP is **not** in M1 (needs an SMS provider). Leave a clean seam for it.

### 7.2 Username + PIN on Supabase Auth

Students often have no email or phone. Implement on top of Supabase email/password:

- Synthetic email: `<username>@<institute_id>.students.invalid` (the `.invalid` TLD can never receive mail). Created server-side with the admin API (`email_confirm: true`), never shown to users.
- Password = the 6-digit PIN. Set the portal project's minimum password length to 6 (the portal project only; the simulator project stays at 8).
- Sign-in page `/<slug>/login` has a Student / Staff toggle. Student: username + PIN → server action resolves the institute from the slug, builds the synthetic email, calls `signInWithPassword`.
- Lockout: 5 failed attempts for the same (institute, username) within 15 minutes → refuse for 15 minutes (`login_attempts`). Message: "Too many tries. Ask your teacher, or wait 15 minutes."
- PIN reset: only an institute admin or that student's teacher can set a new PIN. Show it once.
- Never let students choose PINs like 000000, 123456 or all-same digits. Generate random PINs by default.

### 7.3 Institute boundary at sign-in

After sign-in, the server checks that the user's `portal_users.institute_id` matches the slug's institute. If not, sign them out and show "This account belongs to a different institute." Every later request repeats the check in the proxy (§8.1).

### 7.4 One session at a time

1. After a successful sign-in, call `supabase.auth.signOut({ scope: 'others' })` from the new session.
2. Store the new JWT's `session_id` claim in `portal_users.current_session_id`.
3. In `proxy.ts`, for portal routes: if the claim's `session_id` ≠ the stored one, sign out and redirect to `/<slug>/login?reason=signed_in_elsewhere`. Cache the stored value per request; it's one indexed lookup.
4. Set the portal project's JWT expiry to 10 minutes so revoked sessions can't linger.

### 7.5 Cookies and redirects

- Supabase SSR cookies are host-only (never pass a `domain` option).
- Copy the simulator's `safeNext` idea into `apps/portal/src/lib/safe-next.ts` and use it for every `next` redirect. Also reject any `next` that points at a different institute slug.
- Supabase redirect allow-list for the **portal project**: `http://localhost:3002/**`, `https://learn.stemgrid.in/**`, `https://admin.stemgrid.in/**`.

---

## 8. Routes

### 8.1 `src/proxy.ts` (portal)

Runs before every page request (exclude static assets as the simulator does).

1. Refresh the Supabase session (`getClaims()`, nothing between `createServerClient` and that call, as in the simulator).
2. **Host gate:** if host is `admin.stemgrid.in` (or `localhost:3002` with path `/console`), rewrite to the `/console/*` route group. On `learn.stemgrid.in`, any `/console` path returns 404.
3. Console routes require a `staff_users` row and MFA level `aal2`; else redirect to `/console/login`.
4. Portal routes `/<slug>/...`:
   - Unknown or reserved slug → "Find your institute" page.
   - Old slug → 308 redirect to the current slug (keep a `slug_history` table or column).
   - Signed out on any protected path → `/<slug>/login?next=…`.
   - Signed in but wrong institute → sign out, back to login with a message.
   - Wrong role for the area (e.g. a student on `/admin/...`) → their role's home.
   - Session mismatch (§7.4) → sign out.
   - Institute `status` gates: before `paid` only `/activate` works; `suspended` blocks students and makes staff read-only; `lapsed`/`cancelled` shows a closed page with the StemGrid contact.
5. **Active-student counting** (students only): if cookie `sg_m` ≠ current IST month, call the `record_active_student()` RPC (security definer). It inserts into `monthly_active_students` if room remains under the current limit, or returns `limit_reached`. On success set host-only cookie `sg_m=<YYYY-MM>`. On `limit_reached`, sign the student out and show the limit page. Never decrement.

### 8.2 Portal pages (`learn.stemgrid.in`)

| Path | Role | Purpose | Milestone |
|---|---|---|---|
| `/` | Anyone | Find your institute: search by name, go to its sign-in page | M1 |
| `/activate/<token>` | New institute admin | Verify email, set password, accept terms + consent, pay joining amount, see confirmation | M1 |
| `/<slug>/login` | Everyone at the institute | Branded sign-in, Student / Staff toggle | M1 |
| `/<slug>/join` and `/<slug>/join/<code>` | Student | Enter batch code, then create username + get PIN (if self-join is on) or sign in | M1 |
| `/<slug>/invite/<token>` | Teacher, admin | Accept invite, set password | M1 |
| `/<slug>/reset` | Admin, teacher | Password reset email | M1 |
| `/<slug>/admin/setup` | Institute admin | First-run checklist: logo, profile, first teacher, first batch | M1 |
| `/<slug>/admin/dashboard` | Institute admin | Usage vs limit, free-period countdown or next bill, counts, recent activity, prompts | M1 |
| `/<slug>/admin/batches`, `/<slug>/admin/batches/<id>` | Institute admin | Unlimited batches; create, edit, copy, archive; assign teachers; join code and link, reset code; roster | M1 |
| `/<slug>/admin/teachers` | Institute admin | Invite, see batches and last login, deactivate | M1 |
| `/<slug>/admin/students`, `/<slug>/admin/students/<id>` | Institute admin | Add one, CSV upload, search, filter, move between batches, archive, reset PIN, print login slips | M1 |
| `/<slug>/admin/billing` | Institute admin | Wave, plan, locked prices, lock and minimum-term end, monthly usage history, invoices, AutoPay status, plan recommendation | M1 (read + invoices), M2 (AutoPay, upgrades, packs) |
| `/<slug>/admin/billing/result` | Institute admin | Return page after payment | M1 |
| `/<slug>/admin/reports` | Institute admin | Progress by batch and student, CSV export | M2 |
| `/<slug>/admin/settings` | Institute admin | Profile and logo | M1 |
| `/<slug>/teacher/batches`, `/<slug>/teacher/batches/<id>` | Teacher | Own batches, roster, add students to own batches, reset PINs of own students | M1 |
| `/<slug>/teacher/assignments`, `/<slug>/teacher/assignments/<id>` | Teacher | Create, copy to batches, grade | M2 |
| `/<slug>/student/home` | Student | Batches, projects, due work, grades | M1 (batches + projects), M2 (work) |
| `/<slug>/student/projects` | Student | Saved builds: open, rename, duplicate, delete | M1b |
| `/<slug>/simulator`, `/<slug>/simulator/<project_id>` | All roles | The simulator inside the portal, saving to `student_projects` | M1b |
| `/<slug>/student/assignments/<id>`, `/<slug>/student/results` | Student | Do and submit work, see marks | M2 |
| `/<slug>/help` | Everyone | Help and contact (info@stemgrid.in, +91 89251 72636) | M1 |

Slug rules: lowercase letters, digits and hyphens, 3–40 chars, must start with a letter, unique, not in `reserved_slugs`, never reused. Set by staff at approval.

Batch join codes: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O, 1/I), unique, resettable, optional expiry.

### 8.3 Students joining a batch

Three ways, all ending in a `portal_users` row with role `student` and a `batch_students` row:

1. **Admin or teacher adds** one student: display name → username auto-suggested (`firstname-lastinitial`, deduplicated) → random PIN shown once, with a printable login slip (institute URL, username, PIN).
2. **CSV upload**: columns `name, batch` (optional `username`). Preview, validate, then create. Return a printable sheet of login slips. Max 300 rows per upload.
3. **Self-join** (setting per batch, off by default): student opens `/<slug>/join/<code>`, enters their name, gets a username and PIN shown once. Rate-limit per code (e.g. 60 joins per hour).

An existing student joining another batch of the same institute just gets an extra `batch_students` row.

### 8.4 Console (`admin.stemgrid.in`, route group `src/app/console/`)

| Path | Purpose | Milestone |
|---|---|---|
| `/login` | Staff sign-in with TOTP | M1 |
| `/enquiries`, `/enquiries/<ref>` | Read enquiries from the simulator project (§6). Approve (pick slug, wave offered, contact email for activation) or reject with reason | M1 |
| `/institutes`, `/institutes/<id>` | List with status, wave, plan, free-period end, active students this month. Detail: profile, usage history, batches count, payments, invoices, activity log | M1 |
| Institute actions | Resend activation link, record manual payment (bank transfer), mark onboarding complete (sets go-live), pause free period (once, ≤30 days), change plan, suspend, reactivate, cancel | M1 |
| `/members` | Wave places: paid count per wave, places left, member numbers | M1 |
| `/payments` | Payments, failures, upcoming renewals | M1 (list), M2 (AutoPay) |
| `/onboarding` | Paid institutes awaiting training | M1 |
| `/usage` | Near-limit institutes, inactive 14+ days | M2 |
| `/team` | Manage staff users | M1 |

Every console action writes `activity_log` with the staff member's name.

---

## 9. The simulator inside the portal

Students must use the same simulator inside the portal, saving to the portal's database.

### 9.1 Extract the engine (separate PR, mechanical only)

1. Create `packages/sim-engine` with `engine.js`, `engine.d.ts`, `markup.js`, `styles.js` moved **unchanged** from `apps/simulator/src/simulator/`.
2. Change `apps/simulator` imports to `@stemgrid/sim-engine`. Add it to `transpilePackages` in `apps/simulator/next.config.ts`. No other simulator change.
3. Keep Three.js at **0.160.0** (declare it as a peer dependency of the package).
4. Assets stay at `apps/simulator/public/assets/`. The portal gets a copy via a `prebuild`/`predev` script that copies `apps/simulator/public/assets/{modules,products}` into `apps/portal/public/assets/` (gitignore the copy). The engine's `IMG = '/assets/'` then works unchanged on both hosts.
5. **This PR must pass the full regression checklist (§14)**, especially: guest draft, signed-in autosave, `/simulator/<id>`, Ctrl/⌘+S, thumbnails, the landing page demo iframe scrubbing both ways.

If any of that changes, revert to importing by copying the files into the portal instead, and note the drift risk.

### 9.2 Portal host component

Write a new `apps/portal/src/simulator/PortalSimulatorHost.tsx`, modelled on the simulator's `SimulatorHost.tsx` lifecycle (inject styles, set markup, `startSimulator`, `stop()` on unmount, Strict Mode safe), but:

- Saves to `student_projects` (portal project) with the same autosave rules: ~1.5 s debounce, 5 s poll, retry with backoff, Ctrl/⌘+S, thumbnails at most every 30 s and on leave.
- No guest mode, no `localStorage` draft, no `?claim`, no `?demo`.
- The account menu shows the portal user and institute, with "Back to portal".
- Teachers can open (read-only) projects of students in their batches.

Don't edit `SimulatorHost.tsx` or `src/lib/projects.ts` in the simulator app.

---

## 10. Teaching tools (M2)

| Table | Columns |
|---|---|
| `assignments` | id, institute_id, batch_id, created_by, title, instructions, starter_project (jsonb, optional), due_at, max_marks, allow_late (bool, default true), status (`draft` \| `published` \| `closed`) |
| `submissions` | id, institute_id, assignment_id, student_id, project_id (nullable), file_path (nullable), text, submitted_at, is_late, status (`submitted` \| `returned` \| `graded`) |
| `grades` | submission_id, marks, feedback, graded_by, graded_at |
| `announcements` | id, institute_id, batch_id, author_id, body, created_at |

Flow: teacher creates (optionally copies to several of their batches) → students see it on home and get an email if they have one, otherwise in-portal only → student opens the starter project in the simulator or uploads a file, submits (edits allowed until due) → teacher's "to grade" list → marks + feedback, or return for resubmission → student sees the result. Late submissions are accepted and flagged when `allow_late`.

Only students currently in the batch can see or submit. Archived students keep grades in reports but can't sign in.

---

## 11. Payments

### 11.1 M1: joining payment

- Activation page creates a Razorpay **payment link** or order for the wave's join price + 18% GST, with `notes.institute_id`.
- Webhook `POST /api/webhooks/razorpay`: verify signature with `RAZORPAY_WEBHOOK_SECRET`, upsert `payments` by `provider_payment_id` (idempotent), then call `recordPayment()`:
  1. In one transaction, lock the wave row, count paid institutes in that wave. If places remain, assign wave + next `member_number`; if not, set status `awaiting_payment` with a flag `wave_full` so staff can offer the next wave or refund (don't auto-refund).
  2. Status → `paid`, set `paid_at`, create the invoice record, email the receipt.
  3. Update the enquiry to `won` (§6).
- Staff can also record a manual bank-transfer payment from the console (same `recordPayment()` path).

### 11.2 M2: monthly billing

- Razorpay Subscriptions with UPI AutoPay / card mandate, created before the free period ends.
- First charge the day after `free_period_ends_at`. Plan price from `wave_prices` (locked) while `lock_ends_at` is in the future and the subscription has been continuous.
- Extra packs and teacher seats: charge for the full current month immediately (an add-on payment), then included in the next cycle. Removal at next cycle.
- Failure webhook → `startGrace()`. Recovery → `active`.

### 11.3 Invoices

GST invoice per payment: number format `SG/<FY>/<0001>` (FY like 2026-27), seller details from env (§13), buyer name, address and GSTIN, HSN/SAC code, taxable value, GST split (CGST+SGST for intrastate, IGST otherwise, based on buyer state vs `INVOICE_SELLER_STATE`). Render to PDF server-side, store in `invoices` bucket. Admin downloads from the billing page.

---

## 12. Daily job (`POST /api/cron/daily`, protected by `CRON_SECRET`)

Idempotent; safe to run more than once a day. Times in IST.

1. Go-live: institutes in `onboarding` with `paid_at` ≥ 7 days ago → go-live now.
2. Free period: compute `free_period_ends_at` = go-live + wave free months + paused days.
3. Reminders: 14 and 7 days before the free period ends (admin email + dashboard banner).
4. Plan recommendation: in the last 30 days of the free period, set `recommended_plan_code` from the peak monthly active count; email admin; after 7 days without confirmation apply it.
5. Free period end → `active` (once the mandate exists) or `grace` if no mandate.
6. Grace day 7 → `suspended`. Due date + 30 days → `lapsed` (lock ends).
7. Write `usage_months` for the previous month on the 1st.
8. Usage warnings at 80% and 100% (once per month per threshold).
9. Data deletion 60 days after `lapsed` or `cancelled`: delete personal data and files, keep `institutes` (anonymised), `payments`, `invoices`.
10. Expire activation tokens and invites.

---

## 13. Environment variables (`apps/portal/.env.local`; provide `.env.example`)

| Variable | Use |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Portal Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Portal project, server only (status changes, user creation, billing writes) |
| `ENQUIRIES_SUPABASE_URL`, `ENQUIRIES_SUPABASE_SERVICE_ROLE_KEY` | Simulator project, server only, read enquiries + update status/notes |
| `NEXT_PUBLIC_PORTAL_URL` | `https://learn.stemgrid.in` |
| `NEXT_PUBLIC_CONSOLE_URL` | `https://admin.stemgrid.in` |
| `NEXT_PUBLIC_SIMULATOR_URL` | `https://simulator.stemgrid.in` (for links to the free product and terms) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `RESEND_API_KEY`, `MAIL_FROM` | Emails (e.g. `StemGrid <info@stemgrid.in>`) |
| `STAFF_NOTIFY_TO` | Team inbox for new payments and failures |
| `CRON_SECRET` | Protects the daily job |
| `INVOICE_SELLER_NAME`, `INVOICE_SELLER_GSTIN`, `INVOICE_SELLER_ADDRESS`, `INVOICE_SELLER_STATE`, `INVOICE_SAC_CODE` | Invoice details (invoicing entity still to be confirmed) |
| `TERMS_VERSION` | Current membership terms version, e.g. `2026-11-v1` |

Never commit `.env*` files other than `.env.example`. Never expose service-role keys to the browser: import them only in files that `import 'server-only'`.

---

## 14. Regression checklist (run before every merge)

On the existing products, everything must behave exactly as before:

- [ ] `pnpm build` passes for `web`, `simulator` and `portal`.
- [ ] stemgrid.in renders, all anchors scroll, the Simulator link goes to the simulator.
- [ ] Simulator landing: all sections, the build demo iframe scrubs forward **and** back, membership section shows no prices.
- [ ] `/signup` individual signup, email confirmation and `/onboarding` work.
- [ ] `/login` with email and with Google (if enabled), `/forgot-password` and `/reset-password` work.
- [ ] `/signup?as=institution` submits, returns an `SG-XXXXXX` reference, inserts the row, sends the Resend email.
- [ ] Guest build keeps a draft; "Save / Sign in" claims it into a project.
- [ ] Signed-in autosave, `/simulator/<id>`, Ctrl/⌘+S, thumbnails, rename/duplicate/delete on `/projects`.
- [ ] `/profile` edit, password change and account deletion work.
- [ ] No new cookie on `.stemgrid.in`; signing in on the simulator does not sign anyone in on the portal, and the reverse.
- [ ] The simulator Supabase project has no new tables, migrations or auth changes.

---

## 15. Milestones and acceptance tests

### M0: before 27 Nov (DIDAC). No portal code required

Nothing to build in the repo. The existing enquiry form collects leads. Staff approve and take joining payments by hand (Razorpay payment link) and keep a sheet. Don't rush portal code for this date.

### M1: core portal, target 15 Dec 2026

Build in this order, one PR per step where possible:

1. `apps/portal` scaffold, proxy, Supabase portal project, migrations for §5 (M1 tables), seeds for waves, plans, prices, reserved slugs, **and the local testing setup in §19** (`portal:local`, demo data, fake services, dev toolbar). Every later step adds to the demo data and to `TESTING.md`.
2. Console: staff login with TOTP, enquiries list and approve/reject, institutes list and detail, members page, team page.
3. Activation flow + Razorpay joining payment + webhook + `recordPayment()` + invoice + emails.
4. Institute sign-in pages, admin setup, dashboard, settings.
5. Batches (unlimited), teacher invites and assignment to batches.
6. Students: add one, CSV, self-join, PIN login, lockout, login slips.
7. Active-student counting, limits, one-session enforcement, status gates.
8. Billing page (read-only: wave, plan, prices, usage history, invoices).
9. Daily job (go-live, free period, reminders, recommendation, usage months).
10. M1b: engine extraction PR (§9.1), then the portal simulator and student projects.

**M1 is done when all of these pass:**

- [ ] Staff approves enquiry `SG-XXXXXX` → institute created with slug → activation email arrives → admin activates, accepts terms, pays → webhook marks it paid with wave Founding and member number 1 → invoice PDF downloads → the enquiry shows `won` in the simulator project's dashboard.
- [ ] When 10 Founding places are paid, the 11th payment is flagged `wave_full`, not given a Founding place.
- [ ] The admin creates 12 batches (no limit hit), invites 2 teachers, assigns them, and each teacher sees only their own batches.
- [ ] A teacher at institute A can't read any row of institute B through the API or by changing the slug in the address.
- [ ] A student who signs in twice in a month counts once; archiving them doesn't reduce the count.
- [ ] During the free period, the 301st new active student in a month is blocked with the friendly message.
- [ ] Signing in on a second device ends the first session within 10 minutes and on its next request.
- [ ] 5 wrong PINs lock that username for 15 minutes.
- [ ] Marking onboarding complete sets go-live and the free-period end date correctly for both waves; the pause adds at most 30 days, once.
- [ ] Every status change appears in the activity log with who did it.
- [ ] The full regression checklist (§14) passes.

### M2: teaching tools and recurring billing, January 2027

Assignments, submissions, grading, announcements, reports and CSV export, AutoPay subscriptions, add-on packs and teacher seats, upgrades, grace/suspend/lapse via webhooks, usage alerts in the console.

### M3: growth, February–March 2027

Lessons and guided tutorials, co-branded certificates, referral rewards, partner directory, plan placement fully automatic, grade bands for schools, optional phone OTP, optional institute subdomains.

---

## 16. Privacy and security requirements

- Most students are under 18. Collect only: display name, username, batch membership, learning activity and projects. No date of birth, address, phone, email or photo for students.
- Activation requires the institute admin to declare that parental consent is obtained for student accounts. Store the time and `TERMS_VERSION`.
- No ads, no tracking scripts, no selling of data on the portal.
- Uploads: check type and size on the server, store privately, serve by signed URL only to allowed users.
- Admin and teacher passwords min 8; staff must use TOTP.
- Activity log kept ≥ 12 months.
- Data export: institute admin can download a CSV of their institute's data (M2).
- Follow India's Digital Personal Data Protection Act, 2023. A privacy policy page must exist (owner to supply text) and be linked from every sign-in page before the first real student account is created.

---

## 17. Conventions

- Student-facing messages are friendly and plain (same tone as the simulator's errors). Example: "That PIN didn't work. Try again, or ask your teacher for a new one."
- IST everywhere for "month" and dates shown to users. Store UTC.
- Money in paise; format as ₹ with Indian digit grouping (₹1,20,000).
- Server Actions for mutations; validate every input on the server; never trust a client-sent `institute_id`, always derive it from the session.
- Every RLS-protected table gets a policy test (a SQL script or a small script using two test institutes) committed under `apps/portal/supabase/tests/`.
- Write an `apps/portal/CLAUDE.md` as you go, in the same style as the simulator's, and add the portal to `CODEBASE.md`.

---

## 18. Decisions the owner still has to make (use these defaults until told otherwise)

| Decision | Default to build with |
|---|---|
| Invoicing entity and GSTIN | Read from env; leave placeholders in `.env.example` |
| Payment provider | Razorpay, behind `src/lib/payments/` |
| Hosting for the portal | Any Node host for Next.js; nothing host-specific committed |
| Student self-join | Supported, off by default per batch |
| Phone OTP | Not in M1 |
| Places-left counter on the public site | Not built. The simulator landing page shows no prices or counters unless the owner asks |
| Privacy policy and membership terms text | Owner supplies; the portal links to `NEXT_PUBLIC_SIMULATOR_URL` pages once they exist, else a placeholder page in the portal |
| Teachers seeing student projects | Read-only for students in their batches |

If a requirement here conflicts with the frozen list in section 0, section 0 wins. Stop and ask the owner.

---

## 19. Local testing: so the owner can click through every screen

The owner is not a developer of this app and must be able to test the whole UI on their own laptop with **no real payments, no real emails, no real student data and no access to the live databases**. Build this **first**, in M1 step 1, and keep it working in every later PR.

### 19.1 One-command start

From the repo root:

```bash
pnpm install
pnpm portal:local     # starts local Supabase, applies migrations, seeds demo data, runs the portal on :3002
```

`portal:local` must:

1. Check Docker is running (local Supabase needs it). If not, print a plain message: "Start Docker Desktop, then run this again."
2. Run `supabase start` inside `apps/portal` (the **portal's** local Supabase, never the simulator's project and never any live project).
3. Run `supabase db reset` (applies all migrations + `supabase/seed.sql`), then `pnpm --filter portal seed:demo` (creates auth users, which SQL seeds can't).
4. Start `next dev --port 3002`.
5. Print the test links and accounts (§19.3) in the terminal.

Also add `pnpm portal:reset` (wipe and re-seed in one go) so the owner can start over any time.

The local `.env.local` is generated by the script from `supabase status` output. The owner never edits env files by hand.

### 19.2 Local addresses that behave like production

Browsers send every `*.localhost` name to the owner's own machine with no setup, and cookies stay separate per host, just like production:

| Production | Local |
|---|---|
| `https://learn.stemgrid.in` | `http://learn.localhost:3002` |
| `https://admin.stemgrid.in` | `http://admin.localhost:3002` |

The proxy's host gate (§8.1) treats `admin.localhost` like `admin.stemgrid.in` and `learn.localhost` like `learn.stemgrid.in`. Add both to the local Supabase redirect allow-list. Don't use plain `localhost:3002` for testing, or the console and portal would share cookies.

### 19.3 Demo data (`seed:demo`)

Deterministic, so the same logins work every time. All PINs and passwords are shown here on purpose: they exist only locally.

| Who | Where to sign in | Login | Password / PIN |
|---|---|---|---|
| StemGrid staff | `admin.localhost:3002/login` | `staff@demo.local` | `demo-staff-123` (TOTP **skipped** in local mode) |
| Admin, **Bright Minds Academy** (`bright-minds`, Founding, `free_period`, 45 days left, 62 active students) | `learn.localhost:3002/bright-minds/login` | `admin@brightminds.demo` | `demo-admin-123` |
| Teacher at Bright Minds (2 batches) | same | `priya@brightminds.demo` | `demo-teacher-123` |
| Teacher at Bright Minds (1 batch) | same | `arun@brightminds.demo` | `demo-teacher-123` |
| Student at Bright Minds | same, Student tab | `ravi-k` | `482915` |
| Student at Bright Minds | same, Student tab | `meera-s` | `735102` |
| Admin, **Nova Robotics** (`nova-robotics`, Charter, `active` on Growth, 88 of 90 students: near limit) | `learn.localhost:3002/nova-robotics/login` | `admin@nova.demo` | `demo-admin-123` |
| Admin, **Spark STEM Centre** (`spark-stem`, `grace`, payment failed 3 days ago) | `learn.localhost:3002/spark-stem/login` | `admin@spark.demo` | `demo-admin-123` |
| **New institute** waiting to activate (`approved`) | Activation link printed in the terminal | — | Set during activation |

Also seed:

- 4 batches at Bright Minds (2 active, 1 archived, 1 with self-join on; join code `BRT7KQ`), 8 batches at Nova.
- 60+ students per busy institute with generated names (clearly fake), a few saved simulator projects, 6 months of `usage_months` history for the charts.
- 5 sample enquiries (§19.4), one already approved, one rejected.
- 3 Founding places already paid, so the members page and wave logic have real-looking numbers.
- M2 onwards: 3 assignments with submissions in each state (submitted, graded, late).

### 19.4 Fake services in local mode

Local mode is on when `PORTAL_MODE=local` (set by the script). Every fake below must be **impossible** to enable in production: check `PORTAL_MODE === 'local'` **and** `NODE_ENV !== 'production'`, and fail the build if `PORTAL_MODE=local` is set in a production build.

| Real service | Local replacement | What the owner sees |
|---|---|---|
| Enquiries from the simulator project | `ENQUIRIES_SOURCE=fixtures`: reads `apps/portal/dev/enquiries.json` (5 samples) and writes status changes back to that file | The console's enquiries page works exactly as in production |
| Razorpay | `PAYMENTS_PROVIDER=mock`: a "Test payment" page with **Pay successfully**, **Fail payment** and **Cancel** buttons, which calls the same `recordPayment()` / failure code as the real webhook | Can test the joining payment, wave-full case and failures without money |
| Emails (Resend) | Local Supabase's email viewer (Mailpit / Inbucket, usually `http://localhost:54324`) for auth emails; app emails are written there too via SMTP, or listed at `/dev/mail` | Every activation, invite, receipt and reminder email can be opened and clicked |
| Daily job | `/dev/cron` page with a **Run daily job now** button | Can trigger go-live, reminders, grace and lapse on demand |
| Today's date | `/dev/clock`: set a pretend date (stored in a dev-only cookie, read by a single `now()` helper used everywhere instead of `new Date()`) | Can jump to "free period ends tomorrow" or "payment due + 8 days" and see what happens |
| TOTP for staff | Skipped | Fewer steps when testing |
| Invoice PDFs | Generated as normal, stored in local storage | Downloads work |

### 19.5 Dev toolbar

In local mode only, show a small floating bar at the bottom of every page with:

- **Switch user**: one-click sign-in as any seeded account (staff, each admin, each teacher, a student).
- **Date**: the pretend date, with a link to `/dev/clock`.
- **Run daily job**, **Mailbox**, **Reset demo data** (calls `portal:reset` logic).
- The current institute status, with a dropdown to force it (approved, paid, onboarding, free_period, active, grace, suspended, lapsed) for checking how each state looks.

### 19.6 Click-through scripts the owner can follow

Put these in `apps/portal/TESTING.md`, written for a non-developer, with the exact links:

1. **Full join journey:** console → approve an enquiry (choose a slug) → open the activation email in the mailbox → activate, accept terms → Test payment → Pay successfully → see the invoice and member number → back in the console, mark onboarding complete → the admin dashboard shows the free-period countdown.
2. **Wave full:** with the toolbar, set Founding places to full → pay for a new institute → see it flagged for the next wave.
3. **Run an institute:** as Bright Minds admin, create a batch, invite a teacher (accept from the mailbox), add a student, upload the sample CSV in `dev/students-sample.csv`, print login slips.
4. **Student:** sign in as `ravi-k`, open the simulator, build something, check it saves; open the same account in a second browser and see the first one signed out.
5. **Limits:** as Nova Robotics (88/90), sign in three new students and see the third blocked, then the 80% and 100% warnings on the admin dashboard.
6. **Money trouble:** as Spark STEM, see the grace banner; set the date 5 days later and run the daily job; see students blocked and admin read-only.
7. **End of free period:** set the date to 10 days before Bright Minds' free period ends, run the daily job, see the plan recommendation and the reminder email.
8. **Separation:** signed in as Bright Minds' teacher, change the address to `/nova-robotics/...` and see the "different institute" message.
9. **Nothing else broke:** run the simulator app (`pnpm dev:sim`, `localhost:3001`) and go through the regression checklist (§14).

### 19.7 Rules

- Local mode never connects to the live portal project, the simulator's live project, Razorpay live keys or Resend.
- Seed data uses `.demo` / `.local` emails and obviously fake names only.
- Every new feature ships with: seed data that shows it, a dev-toolbar shortcut if it depends on dates or status, and a click-through step in `TESTING.md`.
