# Deploying the StemGrid Portal (Vercel + the stemgrid Supabase project)

How `learn.stemgrid.in` and `admin.stemgrid.in` go live. Follow it in order.

**Owner decision (25 Nov 2026):** the portal lives in the **same Supabase project as the simulator** (`stemgrid`, ref `otynoieladqnxrhkfhfs`), not a separate one. What that means:
- One database: the portal's tables sit next to the simulator's (`profiles`, `projects`, `institution_enquiries`). The portal's migrations only add portal tables, functions, buckets and storage policies; they don't change the simulator's.
- One migration history, kept in `apps/simulator/supabase/migrations/`. Always push migrations **from `apps/simulator`**.
- One login system: a teacher or admin who already has a simulator account signs in to the portal with the same password. Students' logins are created by the portal (username + PIN), and those accounts could technically also open the simulator site. Sign-ins on the two websites stay separate: each site keeps its own cookie (`simulator.`, `learn.`, `admin.` are separate hosts).
- No change to the project's login settings is needed: student PINs are stored with a fixed prefix, so the 8-character minimum stays.

| Piece | Service | Status |
|---|---|---|
| Database tables, security rules, buckets, prices | Supabase `stemgrid` | **Done** (migrations applied 25 Nov 2026) |
| The app (both addresses) | **Vercel**, one new project, root `apps/portal` | To do: steps 1–4 |
| Email (activation codes, invites, receipts) | **Resend** | To do: step 2 (required: activation needs the email code) |
| First staff login | Supabase dashboard + SQL | To do: step 5 |
| Daily job | Vercel Cron or any scheduler | To do: step 6 |
| Online payments | Razorpay | **Off for now.** Activation ends with "StemGrid will contact you about payment"; staff press *Record bank transfer* in the console. Add the Razorpay keys later to switch it on (step 8) |

Never set `PORTAL_MODE`, `PAYMENTS_PROVIDER=mock` or `ENQUIRIES_SOURCE=fixtures` on Vercel (the build refuses). Keep secret keys only in Vercel's environment variables and your password manager.

---

## 1. Keys from the stemgrid Supabase project

Supabase dashboard → project **stemgrid** → **Project Settings → API Keys** (or **API**). Note:
- **Project URL**: `https://otynoieladqnxrhkfhfs.supabase.co`
- **Publishable / anon key** (public)
- **service_role / secret key** (**secret**: server only)

## 2. Resend (email)

1. resend.com → **Domains** → add `stemgrid.in` and add the DNS records it shows, until it says **Verified**. (Until then you can only send to your own Resend address, so activation emails to institutes won't arrive.)
2. **API Keys** → create a key with sending access (**secret**).
3. Sender: e.g. `StemGrid <info@stemgrid.in>`. Team inbox for alerts: e.g. `info@stemgrid.in`.

## 3. Create the Vercel project

1. vercel.com → **Add New… → Project** → import `nikhilsrinath/stemgrid`.
2. Settings:

| Setting | Value |
|---|---|
| Project name | `stemgrid-portal` |
| Framework preset | Next.js |
| **Root Directory** | `apps/portal` |
| Include files outside the root directory in the build step | **On** (the build copies the simulator engine from `apps/simulator`) |
| Install / Build command | leave the defaults. If install fails with a pnpm version error, set Install Command to `npx pnpm@11.22.0 install --frozen-lockfile` |
| Node.js version | 22.x or newer |

3. Add the environment variables below (**Settings → Environment Variables**, Production), then **Deploy**.
4. **Settings → Functions → Function Region** → **Mumbai (bom1)** (next to the database). Redeploy.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://otynoieladqnxrhkfhfs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable / anon key (step 1) |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key (step 1, **secret**) |
| `NEXT_PUBLIC_PORTAL_URL` | `https://learn.stemgrid.in` |
| `NEXT_PUBLIC_CONSOLE_URL` | `https://admin.stemgrid.in` |
| `NEXT_PUBLIC_SIMULATOR_URL` | `https://simulator.stemgrid.in` |
| `RESEND_API_KEY` | from step 2 (**secret**) |
| `MAIL_FROM` | `StemGrid <info@stemgrid.in>` |
| `STAFF_NOTIFY_TO` | the team inbox |
| `CRON_SECRET` | a long random string, 32+ characters (**secret**) |
| `INVOICE_SELLER_NAME`, `INVOICE_SELLER_GSTIN`, `INVOICE_SELLER_ADDRESS`, `INVOICE_SELLER_STATE`, `INVOICE_SAC_CODE` | the invoicing entity (placeholders are fine for testing; invoices are created when staff record a payment) |
| `TERMS_VERSION` | e.g. `2026-11-v1` |

Not needed: `ENQUIRIES_SUPABASE_URL` / `ENQUIRIES_SUPABASE_SERVICE_ROLE_KEY` (same project, read automatically), Razorpay keys (payments off).

## 4. Connect the two addresses

1. Vercel project → **Settings → Domains** → add `learn.stemgrid.in` and `admin.stemgrid.in` (same project).
2. At your DNS provider add what Vercel shows for each, usually:

| Type | Name | Value |
|---|---|---|
| CNAME | `learn` | `cname.vercel-dns.com` (or the exact value Vercel shows) |
| CNAME | `admin` | same |

3. Wait for **Valid Configuration** on both. HTTPS is automatic.

Until DNS is ready you can already test on the `…vercel.app` address Vercel gives you: it behaves as the portal (`learn`) side. The console needs `admin.stemgrid.in`.

## 5. Your first staff login

1. Supabase → stemgrid → **Authentication → Users → Add user → Create new user**: your email, a strong password, **Auto Confirm User** ticked. (If your email already has a simulator account, skip this: that account is used.)
2. **SQL Editor** → run, with your name and email:

```sql
insert into public.staff_users (id, name, email)
select id, 'Your Name', email from auth.users where email = 'you@example.com';
```

3. `https://admin.stemgrid.in/login` → email + password → scan the QR code with an authenticator app → enter the code. Add teammates from the console's **Team** page.

(Authentication → **Multi-Factor**: TOTP must be enabled. It is on by default for Supabase projects.)

## 6. The daily job

Option A, Vercel Cron: add `apps/portal/vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "35 18 * * *" }] }
```

(18:35 UTC = 00:05 IST). Commit and push; Vercel sends `CRON_SECRET` automatically. Check **Settings → Cron Jobs**.

Option B, any scheduler, once a day:

```bash
curl -X POST https://learn.stemgrid.in/api/cron/daily -H "Authorization: Bearer <CRON_SECRET>"
```

## 7. Live test

1. Submit an enquiry at `https://simulator.stemgrid.in/signup?as=institution` with an email you can read.
2. `admin.stemgrid.in` → **Enquiries** → open it → choose an address (e.g. `test-institute`) and wave → **Approve**.
3. The activation email arrives. (Or press **Resend activation link** on the institute page: the message shows the link to copy.)
4. Open it: email code → password → terms and consent → **Finish activation** ("StemGrid will contact you about payment").
5. Console → the institute → **Record bank transfer** (Joining, amount before GST) → it becomes **Paid** with member number 1, an invoice and a receipt email. The enquiry shows **won**.
6. Console → **Mark onboarding complete** → free period starts.
7. `learn.stemgrid.in/test-institute/login` as the admin: create a batch, add a student (print the slip), sign in as the student on the Student tab, open the simulator and save a build.

Clean up test data before real members join (member numbers count from the first paid institute): ask the developer to remove test institutes.

## 8. Later: switch on online payments (Razorpay)

1. Razorpay → API Keys (Test Mode first) → Key ID + Secret. Webhooks → URL `https://learn.stemgrid.in/api/webhooks/razorpay`, events `payment_link.paid`, `payment_link.cancelled`, `payment_link.expired`, `payment.failed`, a random secret.
2. Vercel env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` → Redeploy. Activation's last step becomes **Pay ₹…**.
3. After testing, repeat with Live Mode keys.

## 9. Before real students

- [ ] Real privacy policy and membership terms text (the portal's `/privacy` and `/terms` are placeholders).
- [ ] Confirmed invoicing entity details in the env vars.
- [ ] Supabase → Authentication → **Rate Limits**: raise sign-ins per 5 minutes (e.g. to 1000). Every student sign-in reaches Supabase from Vercel's servers, so a whole class signing in at once could hit the default limit.
- [ ] Test institutes removed.

## Changing the database later

```bash
cd apps/simulator                     # the shared project's migration folder
supabase link --project-ref otynoieladqnxrhkfhfs
supabase db push --dry-run            # check what will run
supabase db push
```

New portal migrations go into `apps/simulator/supabase/migrations/` too. Push them **before** deploying code that needs them.

## Troubleshooting

| Problem | Fix |
|---|---|
| Build: "Refusing to build: local testing mode is set" | Remove `PORTAL_MODE` / `PAYMENTS_PROVIDER=mock` / `ENQUIRIES_SOURCE=fixtures` from Vercel |
| Build: "copy-sim: missing …" | Turn on "Include files outside the root directory" |
| "We couldn't send the email just now" at activation | Check `RESEND_API_KEY`, `MAIL_FROM`, and that the domain is verified in Resend (Resend → Logs) |
| Staff can't open the console | They need a `staff_users` row (step 5) and an authenticator code |
| A teacher's invite says the email already has a StemGrid account | They use their simulator password; if they forgot it, reset it on simulator.stemgrid.in first |
| Daily job returns 401 | `CRON_SECRET` mismatch |
