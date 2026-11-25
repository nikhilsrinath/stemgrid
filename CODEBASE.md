# StemGrid codebase: end-to-end guide

This document describes the whole StemGrid repository so that an agent (or a new developer) can work on it without first reading every file. It covers what the products are, the URLs, the tech stack, every folder, how the pieces connect, data and auth, environment variables, how to run things, and the rules that are easy to break.

For deep detail on the simulator, also read `apps/simulator/CLAUDE.md`. It is the most detailed per-app guide and is kept up to date. Also read `apps/simulator/AGENTS.md`, which warns that Next.js 16 differs from older versions.

---

## 1. What StemGrid is

StemGrid is an Indian STEM education company. It brings electronics, coding and robotics into schools through:
- **Quark Kits**: plug-and-play hardware with 13 modules, made by technical partner **QBITIO Technologies Pvt. Ltd.**
- **Trained tutors** placed in schools.
- **Lab on Wheels**: StemGrid brings the lab each week, so the school pays ₹0 for hardware.

Business background (services, programs, kit, pricing model, brand voice) is in `docs/StemGrid_Company_Profile.md`.

The repo contains **two websites**:

| App | What it is | Folder | Framework | Production URL | Dev URL |
|---|---|---|---|---|---|
| **Services site (Lab on Wheels)** | Marketing site for schools: who we are, services, programs, contact | `apps/web` | Astro 7 (static) | https://lab.stemgrid.in | http://localhost:4321 |
| **Simulator (StemGrid Beta)** | Landing page plus a 3D in-browser simulator of the Quark Kit, with accounts and saved projects. Being turned into a SaaS product. | `apps/simulator` | Next.js 16 (App Router) + Three.js + Supabase | https://stemgrid.in (landing only) and https://simulator.stemgrid.in (everything else; see section 7) | http://localhost:3001 |

The two sites link to each other:
- `apps/web` → simulator: the "Simulator (Beta)" link in the header and footer uses `SIMULATOR_URL` from `apps/web/src/lib/site.ts`. It reads `PUBLIC_SIMULATOR_URL`, defaulting to `http://localhost:3001` in dev and `https://simulator.stemgrid.in` in production.
- simulator → services site: `SITE_URL` in `apps/simulator/src/app/page.tsx` reads `NEXT_PUBLIC_SITE_URL`, defaulting to `http://localhost:4321` in dev and `https://lab.stemgrid.in` in production. The "Partner with us", "Claim your place" and "Book a demo" CTAs all go to `${SITE_URL}/#contact` (the services site footer).

Shared contact details: phone **+91 89251 72636** (`tel:+918925172636`).

Git remote: `https://github.com/nikhilsrinath/stemgrid.git`, default branch `main`.

---

## 2. Monorepo layout

This is a **pnpm workspace** (`pnpm-workspace.yaml` includes `apps/*` and `packages/*`).

```
Stemgrid/
├── package.json                  root scripts (dev / build both apps)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── .gitignore                    node_modules, dist, .astro, .next, .env*, *.tsbuildinfo (keeps .env.example)
├── CODEBASE.md                   this file
├── docs/
│   └── StemGrid_Company_Profile.md   company knowledge base (services, kit, programs, voice)
├── StemGrid Brochure (1).pdf     product brochure; the source for module specs and copy
├── StemGrid_Membership.pdf       membership programme draft (untracked); source for the Membership section
├── packages/
│   └── tokens/                   @stemgrid/tokens: shared brand CSS tokens
│       ├── package.json          exports "./tokens.css"
│       └── tokens.css
└── apps/
    ├── web/                      services site (Astro), see section 4
    └── simulator/                simulator + accounts (Next.js), see section 5
```

### Root scripts (`package.json`)

| Command | What it does |
|---|---|
| `pnpm install` | Install everything (run once at the root) |
| `pnpm dev` | Run both apps in parallel (web :4321, simulator :3001) |
| `pnpm dev:web` / `pnpm dev:sim` | Run one app |
| `pnpm build` | Build both apps |
| `pnpm build:web` / `pnpm build:sim` | Build one app |
| `pnpm preview` | Preview the built services site |

There is **no linter and no test suite** in either app. `pnpm build` in the simulator also type-checks. Verify changes by hand in the browser.

---

## 3. Shared brand tokens (`packages/tokens`)

`packages/tokens/tokens.css` is a Tailwind v4 `@theme` block, imported by the services site (`@import "@stemgrid/tokens/tokens.css"` in `apps/web/src/styles/global.css`).

| Token | Value | Use |
|---|---|---|
| `--color-red` | `#E3121B` | Primary red (also `theme-color`) |
| `--color-red-dark` | `#B20912` | Depth, shadows |
| `--color-cream` | `#FFF3E0` | Background |
| `--color-ink` | `#111111` | Text, outlines |
| `--color-coral` | `#F0574D` | Accents on **dark backgrounds only** |
| `--font-display` | Bagel Fat One | Logo, headlines, stickers |
| `--font-label` | Archivo Variable (Expanded Black: weight 900, `font-stretch: 125%`) | Labels, pills, the "GRID" in the wordmark. `font-label` utility. |
| `--font-body` | Poppins | Body copy |
| `--radius-card` | 1.25rem | |
| `--shadow-offset` / `-sm` | `6px 6px 0 #111` / `3px 3px 0 #111` | Hard offset shadows (services site look) |

Wordmark: "stem" in Bagel Fat One (red) + "GRID" in Archivo Expanded Black, with a 3×3 dot "grid" mark.

The simulator app does **not** import this package. It uses CSS Modules with its own values (same red), and fonts from Google Fonts (see 5.2).

---

## 4. Services site: `apps/web` (lab.stemgrid.in)

### 4.1 Stack
- **Astro 7**, fully static output (`astro build` → `apps/web/dist/`). No server adapter, no API.
- **Tailwind CSS v4** via `@tailwindcss/vite`; most component styling is in scoped `<style>` blocks inside each `.astro` file.
- **GSAP 3 + ScrollTrigger** for scroll animations; **Lenis** for smooth scrolling.
- **@astrojs/sitemap** generates `sitemap-index.xml`.
- Fonts self-hosted through **@fontsource** (Bagel Fat One, Archivo variable, Poppins 400–700).
- TypeScript strict (`astro/tsconfigs/strict`).

### 4.2 Config
`apps/web/astro.config.mjs`: `site: "https://lab.stemgrid.in"`, dev server on port **4321** and opens the browser, sitemap integration, Tailwind Vite plugin.

### 4.3 Pages and routes
There is **one page**: `/` (`src/pages/index.astro`). It is a single scrolling page with in-page anchors:

| Anchor | Section | Component |
|---|---|---|
| `#top` | Hero | `src/components/Hero.astro` |
| `#who` | Who we are | `src/components/WhoWeAre.astro` |
| `#services` | What we do (three ways to work with StemGrid) | `src/components/Services.astro` |
| `#programs` | Programs (nested inside `#services`) | `src/components/Services.astro` |
| `#contact` | Footer: final call to action, phone, links | `src/components/Footer.astro` |

Other static files: `/robots.txt` (allows all, points to the sitemap), `/sitemap-index.xml`, `/favicon.svg`, logo PNGs, stock photos under `/img/stock/`.

### 4.4 Folder map
```
apps/web/
├── astro.config.mjs
├── package.json              name "web"
├── tsconfig.json
├── public/
│   ├── favicon.svg, robots.txt
│   ├── StemGrid_logo_square_{black,cream,red}.png
│   └── img/stock/*.jpg       classroom and kit photos
└── src/
    ├── pages/index.astro     the only page: Base > Header, Hero, WhoWeAre, Services, Footer
    ├── layouts/Base.astro    <html lang="en-IN">, SEO meta, canonical, Open Graph, Twitter card, imports global.css
    ├── styles/global.css     Tailwind + tokens + fontsource imports, base body/heading styles
    ├── lib/site.ts           SIMULATOR_URL and PHONE (shared by header and footer)
    ├── scripts/motion.ts     shared motion engine: GSAP + ScrollTrigger + Lenis, smooth anchor links, top progress bar
    └── components/
        ├── Header.astro      fixed pill nav: hides on scroll down, sliding active pill, mobile sheet, "Book a demo" (#contact), Simulator link
        ├── Hero.astro
        ├── WhoWeAre.astro
        ├── Services.astro    services + programs (largest component, ~900 lines)
        ├── Footer.astro      "circuit board" footer: pin-hole grid that lights around the pointer, LED links, animated wordmark
        └── art/              hand-built SVG illustrations used as decoration:
                              QuarkBoard, ModuleArt, Mod, Jst, Pin, X1, Van, Suitcase, Tutor, Flask, Stamp, Sticker, Doodle
```

### 4.5 Look and conventions
- Cream background, ink outlines (2–2.5px), **hard offset shadows**, chunky rounded cards, playful SVG art. (This differs from the simulator landing page; see 5.4.)
- Every animation respects `prefers-reduced-motion`; Lenis is skipped when reduced motion is on.
- `Base.astro` adds a `js` class to `<html>` before paint, so CSS can hide content that JS will animate in.

---

## 5. Simulator app: `apps/simulator` (simulator.stemgrid.in)

### 5.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.4.6**, App Router, Turbopack | `reactStrictMode: true`. Next 16 renamed middleware to **`proxy.ts`**. Check `node_modules/next/dist/docs/` before using Next APIs. |
| UI | **React 19.3.1** | Server Components + Server Actions; client components where needed |
| 3D | **Three.js 0.160.0** (npm) | **Keep it pinned at 0.160.0.** |
| Backend | **Supabase** (Postgres, Auth, Storage) | `@supabase/ssr` 0.12 + `@supabase/supabase-js` 2.x |
| Email (optional) | **Resend** HTTP API | Only for institution enquiry notifications |
| Styling | CSS Modules (`*.module.css`) | The simulator's own CSS is a JS string (see 5.6) |
| Language | TypeScript strict; the engine is plain JS with a `.d.ts` | Path alias `@/*` → `src/*` |
| Runtime | Node.js 20.9+ | |

Scripts (in `apps/simulator`): `pnpm dev` (`next dev --port 3001`), `pnpm build`, `pnpm start` (port 3001).

### 5.2 Fonts
Loaded **by name from Google Fonts** in `src/app/layout.tsx`: Plus Jakarta Sans (landing page), Poppins (the simulator, which also draws "Poppins" onto canvas textures), Big Shoulders Display and Lexend (account pages). **Don't switch to `next/font`**: canvas text needs the real family name.

### 5.3 Routes

| URL | File | Access | What it is |
|---|---|---|---|
| `/` | `src/app/page.tsx` | public | Marketing landing page for the simulator |
| `/simulator` | `src/app/simulator/page.tsx` | public | A new build. Guests keep a draft in `localStorage`; signed-in users get a project row on their first change, and the URL becomes `/simulator/<id>`. |
| `/simulator?demo` | same | public | Scripted demo mode, used inside an iframe by the landing page (see 5.7) |
| `/simulator?claim=1` | same | signed in | After sign-in, turns the guest draft into a saved project |
| `/simulator/[id]` | `src/app/simulator/[id]/page.tsx` | owner only | Open a saved project (UUID). Signed out → `/login?next=…`; not yours or missing → 404 (RLS makes them look the same). |
| `/login` | `src/app/(auth)/login/page.tsx` | guests | Email + password, Google (if enabled) |
| `/signup` | `src/app/(auth)/signup/page.tsx` | guests | Individual / Institution switch |
| `/signup?as=institution` | same | anyone | Three-step institution enquiry form (not an account). Open to signed-in users too. |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | guests | Sends a reset email |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | via email link | Set a new password |
| `/auth/callback` | `src/app/auth/callback/route.ts` | — | Route handler: exchanges the one-time `code` for a session (Google sign-in, email confirmation, password reset), then redirects to a safe `next` |
| `/onboarding` | `src/app/(app)/onboarding/page.tsx` | signed in | Pick username, display name, role (student / teacher / maker), avatar; sets `onboarded = true` |
| `/projects` | `src/app/(app)/projects/page.tsx` | signed in + onboarded | Saved builds grid: open, rename, duplicate, delete |
| `/profile` | `src/app/(app)/profile/page.tsx` | signed in + onboarded | Edit profile, change password, delete account |

`(auth)` and `(app)` are route groups; they don't appear in the URL.

#### Request gatekeeping: `src/proxy.ts`
Runs before every page request (static assets and images are excluded by the matcher):
1. Refreshes the Supabase session cookie (`supabase.auth.getClaims()`; don't put code between `createServerClient` and this call).
2. Signed out on `/projects`, `/profile`, `/onboarding` → `/login?next=<path>`.
3. Signed in on `/login`, `/signup`, `/forgot-password` → `/projects` (except `/signup?as=institution`).
4. Signed in but not onboarded on `/projects`, `/profile`, `/simulator/<id>` → `/onboarding?next=<path>`.

`src/lib/safe-next.ts` (`safeNext`) only allows same-site relative paths for `next`, which prevents open redirects. Use it for every post-login redirect.

### 5.4 Landing page (`/`)
`src/app/page.tsx` + `src/app/landing.module.css`, with section components in `src/landing/`. In page order:

| Anchor | Section | File(s) |
|---|---|---|
| `#top` | Nav + red hero card with the hole-pattern `HeroGrid` (no images) | `page.tsx`, `HeroGrid.tsx`, `NavAccount.tsx` (shows "Sign in" or "My projects") |
| `#problem` | Pinned three.js scene: a kit box breaks into dots that become a globe of plate holes | `Problem.tsx`, `problem.module.css`, `worldMask.ts` (baked land mask) |
| — | Red swirl, a fixed layer behind the features | `Swirl.tsx`, `swirl.module.css` |
| `#features` | Bento of 4 features (3D, live simulation, plug-n-play, Python) with cut-out renders | `page.tsx`, `public/assets/landing/cut-*.webp` |
| `#how` | "Watch a build": the real simulator in a 1280×800 iframe (`/simulator?demo`), scrubbed by scroll | `BuildDemo.tsx`, `demo.module.css` |
| `#mission` | Mission | `page.tsx` |
| `#partners` | Pinned red card: "Bring StemGrid to your school / academy / institute / university", three ways to partner, CTA | `Partners.tsx`, `partners.module.css` |
| `#membership` | Pinned dark finale: gold dust canvas, 3D membership card, member advantages, "Claim your place" | `Membership.tsx`, `membership.module.css` |
| — | Footer | `Footer.tsx`, `footer.module.css` |

Scroll machinery:
- `SmoothScroll.tsx`: inertial smooth scrolling (custom, not Lenis).
- `Scrub.tsx`: sets a CSS variable `--p` (0..1) on every `[data-scrub]` element (modes: through, `out`, `pin`). Scroll effects are CSS `calc(var(--p) …)` rules.

Look: soft blurred shadows and frosted glass; **no outlines or hard offset shadows** (unlike the services site).

**Membership rule:** content follows `StemGrid_Membership.pdf` (20 places only: 10 Founding Partners, then 10 Charter Members). The site shows **advantages only: never prices, the price lock, discounts or free months** unless the owner asks.

### 5.5 Folder map
```
apps/simulator/
├── package.json, next.config.ts, tsconfig.json
├── .env.example              env var names (copy to .env.local)
├── CLAUDE.md                 detailed agent guide for this app (read it)
├── AGENTS.md                 written by `next dev`: "this is not the Next.js you know"
├── README.md
├── public/assets/
│   ├── modules/module-01..13_*.png   product photos of the 13 kit modules (used in the parts nav)
│   ├── products/x1/…                 X1 console illustration
│   ├── landing/*.webp                screenshots and cut-outs rendered from the real simulator
│   └── qbitio-logo.png
├── legacy/                   the original single-file prototype (index.html + server.js + .bat), for comparison only, not built
├── supabase/
│   ├── config.toml           auth settings (site_url, redirect URLs, email, Google provider)
│   └── migrations/*.sql      the database schema (see 5.8)
└── src/
    ├── proxy.ts              session refresh + route guards (Next 16 "middleware")
    ├── app/
    │   ├── layout.tsx        root layout, Google Fonts links
    │   ├── page.tsx          landing page
    │   ├── landing.module.css
    │   ├── simulator/page.tsx, simulator/[id]/page.tsx
    │   ├── auth/callback/route.ts
    │   ├── (auth)/           login, signup, forgot-password, reset-password
    │   │   ├── actions.ts    Server Actions: signIn, signUp, signInWithGoogle, forgotPassword, resetPassword, submitEnquiry, signOut
    │   │   ├── forms.tsx     'use client' forms (incl. the 3-step institution enquiry)
    │   │   └── asides.ts     copy for the red side panel (kept out of the client file)
    │   └── (app)/            onboarding, projects, profile
    │       ├── actions.ts    Server Actions: completeOnboarding, updateProfile, changePassword, deleteAccount
    │       ├── ProfileFields.tsx
    │       ├── onboarding/Onboarding.tsx, profile/ProfileForms.tsx, projects/Projects.tsx
    ├── landing/              landing page sections (see 5.4)
    ├── lib/
    │   ├── supabase/client.ts   browser client (one per tab)
    │   ├── supabase/server.ts   server client per request + getSession() (user + profile, cached per request)
    │   ├── projects.ts          client-side project CRUD, thumbnail upload, guest draft store (localStorage 'sg:draft')
    │   ├── types.ts             Profile, Project, BuildData, Viewer, thumbUrl(), initials()
    │   ├── viewer.ts            toViewer(user, profile)
    │   ├── origin.ts            siteOrigin() for email/OAuth links; googleEnabled() reads /auth/v1/settings
    │   └── safe-next.ts         open-redirect guard
    ├── simulator/
    │   ├── SimulatorHost.tsx    client component that mounts the engine and owns saving
    │   ├── engine.js            the 3D simulator (~3,900 lines, imperative Three.js)
    │   ├── engine.d.ts          types for startSimulator()
    │   ├── markup.js            the simulator's HTML body as a string
    │   └── styles.js            the simulator's CSS as a string
    └── ui/
        ├── AuthSplit.tsx + auth.module.css   split-screen layout for login/signup/reset pages
        ├── AuthShell.tsx, AppNav.tsx, Avatar.tsx, ui.module.css   shared look for onboarding/projects/profile
        └── avatar-upload.ts                 avatar resize + upload helper
```

### 5.6 How the simulator is hosted
The simulator is the original imperative Three.js app, ported almost line for line. **It is not built from React components.**
- `SimulatorHost.tsx` on mount: injects a `<style>` tag (from `styles.js`), sets the host div's `innerHTML` (from `markup.js`), and calls `startSimulator(opts)`. On unmount it calls `stop()` and removes both.
- The simulator CSS styles `html`, `body` and every `button` globally, so it must only be on the page while the simulator is mounted. **Don't import it as a global stylesheet.**
- `startSimulator()` returns `{ stop, serialize, load, snapshot, toast, isEmpty }`. `opts.onChange()` fires on edits (never in demo mode).
- React Strict Mode mounts twice in dev, so anything global the engine creates must be undone in `stop()`. Use the engine's local `addEventListener(...)` and `docOn(...)` helpers rather than `window.`/`document.addEventListener`.
- Images come from `public/assets/` (`IMG = '/assets/'`).

### 5.7 Engine architecture (`src/simulator/engine.js`)
Sections are marked with `/* ===== … ===== */` banners. Search the banner text to jump. In order:

1. **PARTS LIBRARY**: the `LIBRARY` array drives the side nav (`live: true` = draggable, otherwise "Soon").
2. **RENDERER / SCENE**: renderer, camera, lights, helpers (`mesh`, `rbox`, `mat`, `canvasTex`, `V`, `damp`).
3. **PART MODELS**: one `buildXxx(parts)` per module, modelled on product photos; then the **`MODULES` registry** (`name`, `foot`, `ports`, `build`, optional `sim`; `board: true` marks the Quark controller).
4. **BRAIN**: the simulation. Boards see modules cabled to them; `simTick` (~0.1 s) ticks sensors then outputs. Also the OLED firmware and 128×64 1-bit drawing. **To add a module: write a builder + a `MODULES` entry with a `sim` block. The core needs no changes.**
5. **WORLD STATE**: `plates`, `modules`, `cables`; placement, snapping, fit checks, removal.
6. **CABLE GEOMETRY**, **SELECTION + INSPECTOR** (right panel), **ACTIONS**, **POINTER / DRAG ENGINE**, **UI STATE**.
7. **CONTROLS + LOOP**: rendering is **on demand**. Changes that don't move anything (materials, textures, emissive) must call `kick()` or they won't show.
8. **CODE**: a custom interpreter for a Python subset (`pyLex` → `pyParse` → generator-based `pyExec`/`pyEval`). Each statement yields, so `sleep` and infinite loops don't freeze the page. Board API in `pyApi(board, P)`. `def`, `import` and f-strings are rejected on purpose. Error messages are written for students, so keep that tone.
9. **DEMO DRIVER** (only with `?demo`): the scripted build for the landing page. Must work both ways (scrolling back undoes steps). Timings `S` must match `STEP_AT` in `BuildDemo.tsx`. Never call `.focus()` in demo mode. Create audio only through `audio()`.
10. **SAVE + LOAD**: `serialize()` → JSON (format v1); `load(data)`. Saved knobs are listed in `PERSIST`; add new state there. `snapshot()` → 480×300 webp thumbnail.

Modules in the parts library: Base plate, Quark C3 controller (ESP32-C3), X1 console ("Soon"), Ultrasonic, DHT11 temp & humidity, Light sensor, IR receiver, RFID reader, Potentiometer, Dual push button, OLED display, **RGB LED (simulator only, not in the kit)**, Servo motor, Buzzer, Zap connector (keyed 4-wire cable).

Conventions: the base plate is a 16×16 hole grid (`PLATE`); a module's `foot`/`ports` are in its local frame with the Zap socket at +z. Ranges and behaviour match the real parts (DHT11 range and refresh, servo 0–180°, etc.), citing the brochure. Keep that realism.

### 5.8 Data: Supabase
- Project **stemgrid** (ref `otynoieladqnxrhkfhfs`, region ap-south-1). Postgres 17.
- Schema lives in `supabase/migrations/`; apply with `supabase db push`. Auth settings in `supabase/config.toml`; apply with `supabase config push` (CLI 2.106 fails on the storage section: set `[storage] enabled = false` temporarily, push, then restore).
- Auth: email + password (confirmation on, min length 8) and Google OAuth (only shown when enabled in Supabase). Redirect URLs allowed: `http://localhost:3001/**` and `https://simulator.stemgrid.in/**`. Before launch, set up custom SMTP: the built-in mailer only sends a few emails an hour.

Tables (all with Row Level Security):

| Table | Purpose | Key columns | Access |
|---|---|---|---|
| `profiles` | One per auth user, created by trigger `handle_new_user` | `username` (citext, `^[a-z0-9_]{3,20}$`, unique), `display_name`, `avatar_url`, `role` (student/teacher/maker), `bio`, `onboarded` | Owner read/update only |
| `projects` | Saved builds | `owner_id`, `name` (1–80), `data` jsonb (= `serialize()`, <1 MB), `thumbnail_path`, `module_count` | Owner CRUD only |
| `institution_enquiries` | Institution sign-up enquiries | `ref` (`SG-XXXXXX`), org details, contact, interests, timeline, `status` (new/contacted/meeting/proposal/won/lost/spam), `notes` | **Insert only** (anon + authenticated); nobody reads through the API. The team reads rows in the Supabase dashboard. |

RPCs: `username_available(u)` (live check during onboarding), `delete_my_account()` (deletes the auth user; profile and projects cascade; the `deleteAccount` server action deletes storage files first).

Storage buckets (public read, write only under `<user id>/…`): `avatars` (2 MB) and `thumbnails` (1 MB; path `<uid>/<projectId>.webp`).

Migrations:
1. `20261122160000_accounts_projects.sql`: profiles, projects, storage buckets and policies, RPCs.
2. `20261122170000_delete_account_no_storage.sql`: `delete_my_account` no longer touches `storage.objects`.
3. `20261125120000_institution_enquiries.sql`: the enquiries table (currently uncommitted).

### 5.9 Saving (in `SimulatorHost.tsx`)
- **Signed in**: autosave ~1.5 s after a change, plus a 5 s poll (3D knob drags don't always fire `changed()`), with retry and backoff. Ctrl/⌘+S saves. Thumbnails upload at most every 30 s and on leave. The first change to a new build creates the row and `history.replaceState`s to `/simulator/<id>`.
- **Guests**: draft in `localStorage['sg:draft']`. "Save / Sign in" goes to `/login?next=/simulator?claim=1`. A plain `/simulator` visit with a draft offers to restore it.
- The app bar's account menu is a React portal into `#acct`; its styles (`.acct-*`, `.sg-modal`, `#saveState`) are in `styles.js`.

### 5.10 Institution enquiry flow
`/signup?as=institution` → three steps (institution, point of contact, needs) → `submitEnquiry` server action inserts into `institution_enquiries`, returns a reference like `SG-7KQ2MX`, and, if `RESEND_API_KEY`, `ENQUIRY_NOTIFY_TO` and `ENQUIRY_NOTIFY_FROM` are set, emails the team through Resend. It does not create an account.

### 5.11 Environment variables (`apps/simulator/.env.local`, see `.env.example`)

| Variable | Required | Use |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase publishable (anon) key |
| `NEXT_PUBLIC_APP_URL` | production | This app's public origin, for email and OAuth links (falls back to request headers) |
| `NEXT_PUBLIC_SITE_URL` | optional | Services site URL (defaults to localhost:4321 in dev, https://stemgrid.in in prod) |
| `SUPABASE_DB_PASSWORD` | CLI only | For `supabase db push` |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` | CLI only | Google provider, used by `config.toml` |
| `RESEND_API_KEY`, `ENQUIRY_NOTIFY_TO`, `ENQUIRY_NOTIFY_FROM` | optional | Enquiry notification emails |

Services site: `PUBLIC_SIMULATOR_URL` (optional; defaults as described in section 1).

Never commit `.env.local` or any `.env*` other than `.env.example`.

---

## 6. Request and data flow, end to end

```
Visitor ── lab.stemgrid.in (Astro static HTML/CSS/JS, no backend)
   │          "Simulator" link ─────────────────────────────┐
   │          "Book a demo" → #contact (phone CTA)          │
   ▼                                                        ▼
simulator.stemgrid.in (Next.js 16)
   proxy.ts ── refresh Supabase session cookie, guard routes
   │
   ├─ /                 landing (Server Component + client scroll effects)
   │    └─ iframe /simulator?demo  (engine DEMO DRIVER, scrubbed by scroll)
   ├─ /simulator[/id]   SimulatorHost (client) → engine.js (Three.js)
   │    ├─ guest: localStorage draft
   │    └─ signed in: supabase-js (browser) → projects table + thumbnails bucket (RLS)
   ├─ /login /signup …  Server Actions → Supabase Auth → email/Google → /auth/callback
   ├─ /signup?as=institution → submitEnquiry → institution_enquiries (+ Resend email)
   └─ /onboarding /projects /profile → Server Components + Server Actions → profiles / projects
```

---

## 7. Hosting and deployment

- `apps/web` (Lab on Wheels) deploys to **lab.stemgrid.in** (static `dist/`).
- `apps/simulator` deploys once (a Node host for Next.js, since it uses Server Actions, a route handler and the proxy) and gets **two domains**: **stemgrid.in** (the main site: only the landing page `/`) and **simulator.stemgrid.in** (login, signup, simulator, projects, profile). `splitHosts()` in `apps/simulator/src/proxy.ts` redirects every other path on stemgrid.in to simulator.stemgrid.in, and `/` on simulator.stemgrid.in back to stemgrid.in, so logins and the session cookie stay on one host. Links between them use `apps/simulator/src/lib/hosts.ts`.
- Simulator env vars for production: `NEXT_PUBLIC_APP_URL=https://simulator.stemgrid.in`, `NEXT_PUBLIC_HOME_URL=https://stemgrid.in`, `NEXT_PUBLIC_SITE_URL=https://lab.stemgrid.in` (plus the rest of 5.11). Unset `NEXT_PUBLIC_HOME_URL` turns the host routing off. Supabase's redirect allow-list only needs simulator.stemgrid.in (already in `config.toml`).
- No hosting provider config (e.g. `vercel.json`) is committed.

---

## 8. Rules and gotchas (read before editing)

1. **Next.js 16 is newer than most training data.** Middleware is `src/proxy.ts` (exported function `proxy`). Read `node_modules/next/dist/docs/` before using unfamiliar APIs. `next dev` rewrites `AGENTS.md`; that's expected.
2. **Three.js stays at 0.160.0.**
3. **Don't move fonts to `next/font`** in the simulator.
4. **Simulator CSS is global and string-injected** only while the simulator is mounted. Don't import it elsewhere.
5. **Engine globals must be cleaned up in `stop()`**; use the engine's listener helpers.
6. **On-demand rendering:** call `kick()` after visual-only changes.
7. **New persistent engine state** → add to `PERSIST` (and snap in `load` if smoothed).
8. **Demo mode:** keep `S` (engine) and `STEP_AT` (`BuildDemo.tsx`) in sync; steps must reverse; no `.focus()`; keep `.stage` and the iframe at exactly 1280×800.
9. **Landing renders** in `public/assets/landing/` are real simulator captures; re-capture them if the 3D look changes.
10. **Membership section:** advantages only, never pricing.
11. **Redirects:** always pass user-supplied `next` through `safeNext()`.
12. **RLS is the security boundary.** Every table has it; keep new tables the same, and keep files under `<uid>/` in storage.
13. **Student-facing error messages** (interpreter, forms) are friendly and plain. Keep that tone.
14. **Module realism:** match real part behaviour and cite the brochure. The RGB LED is the only simulator-only module.
15. **Two visual languages:** services site = hard outlines and offset shadows; simulator landing = soft shadows, frosted glass, no outlines.
16. **No tests or linter.** Run `pnpm build` (type-check) and check changes in the browser at the dev URLs.

### Known loose ends (as of 25 Nov 2026)
- The services site header and footer link to `#kit` ("Quark Kit"), but no element has `id="kit"`, so that link goes nowhere.
- `Base.astro` defaults the Open Graph image to `/og.png`, which doesn't exist in `apps/web/public/`.
- Uncommitted in the working tree: the split-screen auth pages (`AuthSplit.tsx`, `auth.module.css`, `asides.ts`), the institution enquiry flow and its migration, and `StemGrid_Membership.pdf`.
- Custom SMTP isn't set up in Supabase yet (needed before launch).

---

## 9. Institute Portal: `apps/portal` (learn.stemgrid.in + admin.stemgrid.in)

Added Nov 2026 from `PORTAL_BUILD_BRIEF.md`. One Next.js 16 app serving two hosts: the institute portal (`learn.stemgrid.in`: institute admins, teachers, students) and the StemGrid console (`admin.stemgrid.in`: approve enquiries, payments, onboarding, members). It uses the **same Supabase project as the simulator** (`stemgrid`; owner decision, 25 Nov 2026): portal tables sit next to `profiles`/`projects`, the migrations live in `apps/simulator/supabase/migrations/` (`20261126*`), and admins/teachers share the auth user pool (an existing simulator account signs in with the same password). Cookies stay host-only, so signing in on one site never signs you in on another. The console reads `institution_enquiries` and updates only its `status`/`notes`. Applied to the live project on 25 Nov 2026.

| | |
|---|---|
| Dev | `pnpm portal:local` (local Supabase in Docker + demo data, port 3002) — see `apps/portal/TESTING.md` |
| Build | `pnpm build:portal` (also part of `pnpm build`) |
| Guide | `apps/portal/CLAUDE.md`, deploying: `apps/portal/DEPLOYMENT.md` |
| Simulator engine | copied from `apps/simulator/src/simulator` at dev/build time (`scripts/copy-sim.mjs`, gitignored); the simulator app is unchanged |

Root scripts added: `dev:portal`, `build:portal`, `portal:local`, `portal:reset`. `pnpm dev` still runs only web + simulator.
