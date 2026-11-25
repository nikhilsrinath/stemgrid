# Testing the StemGrid Portal on your laptop

Everything here runs only on your computer. There are **no real payments, no real emails, no real student data, and no connection to the live databases**. You can break anything and start again.

## Before the first time

1. Install **Docker Desktop** and open it. Wait until it says "Engine running".
2. In a terminal at the `Stemgrid` folder, run once: `pnpm install`

## Start

```bash
pnpm portal:local
```

The first run downloads the database (a few minutes). When it's ready, the terminal prints all the links and logins. Leave the terminal open while testing. Press `Ctrl+C` to stop.

**Start over at any time:** `pnpm portal:reset`, or the **Reset demo data** button on the toolbar.

> Use the addresses below exactly: `learn.localhost:3002` for the portal and `admin.localhost:3002` for the console. They behave like the real `learn.stemgrid.in` and `admin.stemgrid.in`, and keep their sign-ins separate. Don't use plain `localhost:3002`.

## The toolbar

A small dark bar sits at the bottom of every page (only on your laptop):

| Button | What it does |
|---|---|
| **Switch user** | Signs you in as any demo person in one click |
| **📅 date** | The pretend date. Click it to jump to another day |
| **Run daily job** | Does what the nightly job does: go-live, reminders, grace, lapse |
| **Mailbox** | Every email the portal "sent" |
| *Institute: status* | (on an institute's pages) Force its status to see how each state looks |
| **Founding x/10 → fill** | Makes the Founding wave full, to test the "wave full" case. Press again to restore |
| **Reset demo data** | Wipes everything back to the starting demo |

## Demo logins

| Who | Where | Login | Password / PIN |
|---|---|---|---|
| StemGrid staff | http://admin.localhost:3002/login | `staff@demo.local` | `demo-staff-123` (no authenticator app locally) |
| Bright Minds admin (Founding, free period, 45 days left) | http://learn.localhost:3002/bright-minds/login | `admin@brightminds.demo` | `demo-admin-123` |
| Priya, teacher (2 batches) | same, **Teacher / Admin** tab | `priya@brightminds.demo` | `demo-teacher-123` |
| Arun, teacher (1 batch) | same | `arun@brightminds.demo` | `demo-teacher-123` |
| Ravi, student | same, **Student** tab | `ravi-k` | `482915` |
| Meera, student | same, **Student** tab | `meera-s` | `735102` |
| Nova Robotics admin (Charter, Growth plan, 88 of 90 students) | http://learn.localhost:3002/nova-robotics/login | `admin@nova.demo` | `demo-admin-123` |
| Nova's not-yet-counted students | same, Student tab | `asha-n`, `kabir-n`, `zoya-n` | `586204` |
| Spark STEM admin (payment failed 3 days ago) | http://learn.localhost:3002/spark-stem/login | `admin@spark.demo` | `demo-admin-123` |
| Lotus Learning Hub (approved, waiting to activate) | the activation link in the **Mailbox** | — | you set it |

Other pages: Mailbox http://learn.localhost:3002/dev/mail · Date http://learn.localhost:3002/dev/clock · Database http://127.0.0.1:55323

---

## Click-through scripts

### 1. Full join journey
1. Go to http://admin.localhost:3002/login and sign in as staff.
2. **Enquiries** → open **Sunrise Science Academy** (SG-7KQ2MX).
3. Check the address (e.g. `sunrise-science`) and the wave, then **Approve and send activation link**.
4. Open the **Mailbox** (toolbar) → open "Welcome to StemGrid: activate Sunrise Science Academy" → click the link.
5. **Send code** → back in the Mailbox, open the code email → type the 6 digits → **Verify**.
6. Enter your name and a password (8+ characters) → **Create account**.
7. Fill in the state, tick both boxes (terms and parental consent) → **Continue**.
8. **Pay ₹6,490** → on the Test payment page press **Pay successfully**.
9. You see "Payment received" with your **member number**. The Mailbox has the receipt.
10. **Set up your portal** → Billing → **Download PDF** under Invoices to see the GST invoice.
11. Back in the console: **Institutes** → Sunrise → **Mark onboarding complete (go live)**.
12. Switch to the new admin (sign in at `/sunrise-science/login`): the dashboard shows the free-period countdown (3 months for Founding).

Also check: the enquiry now shows **won** in the console's Enquiries list ("Won" tab).

### 2. Wave full
1. Toolbar → **Founding 3/10 → fill** (the Founding wave becomes full).
2. Do script 1 with **Little Inventors STEM Centre** (SG-4HD9PA), offering **Founding Partners**.
3. After **Pay successfully** you see "the last Founding Partners place was taken…". No member number.
4. Console → **Members**: a warning lists it as "paid while wave full". Open it: **Offer this wave instead** (Charter) gives it a Charter place, or **Mark refunded and close**.
5. Toolbar → **Founding → restore** to put the wave back to 10 places.

### 2b. Packages and a Standard plan (no membership)
1. Console → **Packages**. The **Price sheet** tab shows plans (monthly, annual, per student, member prices), add-ons, billing rules and each package's terms.
2. **Standard plans** tab → change Growth's monthly price to 13000 → **Save plans**. The price sheet's annual column now shows ₹1,30,000. Put it back to 12000.
3. **Add-ons** → add "Workshop day", price 8000, per "day" → **Add**. It appears on the price sheet. **Remove** it again. (Extra students, extra teacher and onboarding have no Remove: billing uses them.)
4. **Membership waves** → Founding: try Places = 2 → "3 places are already taken…". Edit a term line → **Save Founding Partners**.
5. **Enquiries** → **Greenfield Public School** (SG-9TRW3C) → Package offered: **Standard plan** → Plan: **Growth**. The blue box shows the joining amount (Growth's first month + onboarding, + GST) → **Approve**.
6. Do script 1 steps 4–8 with Greenfield. Step 3 shows the **Standard plan terms**; step 4 shows "First month (Growth)" + "Onboarding and training".
7. After paying: "Payment received" and "Standard plan: Growth", no member number. Console → Greenfield → **Mark onboarding complete**: it goes straight to **Active** (no free period). Its admin's Billing page shows the regular plans and add-ons and the minimum-term end date.

### 3. Run an institute
1. Toolbar → Switch user → **Bright Minds admin**.
2. **Batches** → **+ New batch** → create one. Note its join code. (There's no limit: make as many as you like.)
3. **Teachers** → invite `newteacher@brightminds.demo` as Teacher with your new batch → Mailbox → open the invite → set a password. You're now that teacher and see only that batch.
4. Back as admin: **Students** → **Add students** → One student → type a name → **Add student**. A login slip appears with the username and PIN. **Print slips** to see the printable sheet.
5. **Add students** → **Upload CSV** → choose `apps/portal/dev/students-sample.csv` → **Check the file** → one row shows a problem (username taken), the others are OK → **Create** → print the slips.
6. Tick a few students → **New PINs + print slips**, or **Move to…** another batch.

### 4. Student
1. Toolbar → Switch user → **Ravi (student)** (or sign in on the Student tab with `ravi-k` / `482915`).
2. **New build** → drag a few modules onto the plate. The top bar shows **Saved** after a moment. Rename the build by clicking its name.
3. Go back (house button) → **My projects**: the build is there with a picture.
4. Open a **second browser** (or a private window), go to http://learn.localhost:3002/bright-minds/login and sign in as `ravi-k` again. Go back to the first browser and click anything: it says "You were signed out because this account signed in on another device".

Also: as **Priya**, open **Robotics Saturday** → Recent student builds → open Ravi's build: it opens **view only**.

### 5. Limits
1. Sign in as **Nova Robotics admin**: the dashboard shows 88 / 90 and a warning banner (over 80%).
2. Sign out. On the Student tab sign in as `asha-n` / `586204` → works (89/90). Sign out.
3. Sign in as `kabir-n` / `586204` → works (90/90). Sign out.
4. Sign in as `zoya-n` / `586204` → blocked: "Your institute has reached this month's student limit…".
5. Sign in as the Nova admin again: the banner now says the limit is reached. Press **Run daily job**, then check the Mailbox for the 80% and 100% warning emails.
6. Wrong PIN test: on the Student tab type `ravi-k` with a wrong PIN 5 times. The 6th try says "Too many tries. Ask your teacher, or wait 15 minutes." As Priya or the admin, give Ravi a **new PIN**: that unlocks him straight away.

### 6. Money trouble
1. Sign in as **Spark STEM admin**: a yellow "Payment due" banner. Everything still works.
2. Toolbar date → **+5 days** → toolbar **Run daily job** (it suspends Spark: grace day 7 is reached).
3. Reload: a red "Read-only" banner. Try to add a batch or student: "Your institute is read-only…".
4. Sign in as a Spark student (any: Database → `portal_users`, or use the Force status and a Bright Minds student instead): students are blocked.
5. Console → Institutes → Spark → **Record bank transfer** (Monthly) → it's **Active** again.
6. Toolbar date → **Back to today's real date** on the Date page.

### 7. End of the free period
1. Toolbar date: jump to 10 days before Bright Minds' free period ends (it ends 45 days after the reset, so **+35 days**).
2. **Run daily job**. Mailbox: the "free period ends in 14 days" reminder (and 7 days, if you jump further) and "we recommend the … plan".
3. As **Bright Minds admin** → **Billing**: the recommendation, with a plan choice. **Confirm plan**.
4. Jump past the end date and run the daily job: without AutoPay (coming in M2) the institute goes to **grace**, as the membership rules say.

### 8. Separation
1. Sign in as **Priya** (Bright Minds teacher).
2. Change the address bar to http://learn.localhost:3002/nova-robotics/teacher/batches → you're sent to Nova's sign-in page with "This account belongs to a different institute."
3. Try http://learn.localhost:3002/console → page not found. The console only exists on `admin.localhost`.
4. Signing in at `admin.localhost` doesn't sign you in at `learn.localhost`, and the other way round.

### 9. Nothing else broke
1. Stop the portal (Ctrl+C). Run the simulator: `pnpm dev:sim` → http://localhost:3001.
2. Go through the regression checklist in `PORTAL_BUILD_BRIEF.md` §14 (landing page, demo scrolling both ways, sign-up, sign-in, guest draft, autosave, projects, profile, institution enquiry form).

---

## Database policy test (for developers)

```bash
cd apps/portal
supabase test db
```

Runs `supabase/tests/rls_test.sql`: signed in as people at institute A, nothing of institute B is visible, and only students' own projects can be written.
