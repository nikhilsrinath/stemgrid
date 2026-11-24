# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also `AGENTS.md`, which `next dev` writes: this Next.js version (16.x) may differ from what you know, so check the guides in `node_modules/next/dist/docs/` before using Next.js APIs.

## What this is

StemGrid Beta is a 3D in-browser simulator of the StemGrid Quark electronics kit, being turned into a SaaS product. Users drag modules onto a base plate, wire them with Zap connectors, and program the Quark C3 board in a Python-like language.

It's a Next.js (App Router, Turbopack) app with two routes:
- `/` (`src/app/page.tsx` + `landing.module.css`): the marketing landing page: nav, red hero card (headline, two buttons, the HeroGrid hole pattern; deliberately no images), the problem section (`src/landing/Problem.tsx`: a pinned three.js scene where a kit box (`spike-box.webp`) breaks into dots that become the plate holes of a globe; land comes from the baked mask in `worldMask.ts`; it ends by opening the red swirl of `Swirl.tsx`, a fixed layer that stays behind the features section, so `.problem` and `.features` sit above it with z-index 1), features bento (one screen tall on desktop: 4 main features (3D, live simulation, plug-n-play, Python) as transparent cut-out renders, `cut-*.webp`), scroll-scrubbed build, mission, partners, membership, footer. No outlines or hard offset shadows: soft blurred shadows and frosted glass. The landing page uses Plus Jakarta Sans (the simulator itself stays on Poppins). The feature pictures in `public/assets/landing/` are real screenshots of the simulator (restored builds captured at 2x and saved as webp; the cut-outs were taken with a temporary transparent-background patch to the engine, then auto-cropped); re-capture them if the 3D look changes. Scroll effects are CSS `calc(var(--p) ...)` rules; `src/landing/Scrub.tsx` sets `--p` (0..1) on every `[data-scrub]` element (modes: through, `out`, `pin`). The partners section (`src/landing/Partners.tsx`) is one red card like the hero, pinned (`data-scrub="pin"` track) while "Bring StemGrid to your ___" rolls its last word (school, academy, institute, university), then released to the next section; the `cut-*.webp` renders float round it, then three ways to work together and the call to action (the services site's `#contact`, and the phone number). Its scroll effects are CSS on `data-scrub`. The membership section (`src/landing/Membership.tsx`) is the pinned finale: the page fades to near-black, gold dust (a 2D canvas) rises with the scroll, a CSS 3D membership card climbs up and stands, then moves aside for the member advantages (`PERKS`) and the contact button. Its copy follows `StemGrid_Membership.pdf` at the repo root (20 places: Founding Partners, then Charter Members); it shows advantages only, never prices, the price lock or discounts. Its timeline is `T`; it sets CSS variables on the stage every frame. The section after the features is `src/landing/BuildDemo.tsx` (+ `demo.module.css`): the real simulator, loaded as `/simulator?demo` in a 1280×800 iframe, scrubbed by scroll. Each frame it calls `window.__sgDemo.set(p)` (p = scroll progress 0..1) and draws the returned pointer and part card over the iframe. On phones and tablets (max-width 990px) it fills the slot height instead and pans sideways to follow the pointer (and holds the right edge while the code is written). Keep `.stage` and the iframe in `demo.module.css` at exactly 1280×800, the W/H the scaling uses. The script itself (module positions, cable ports, code, timings in `S`) is the **DEMO DRIVER** section at the end of `engine.js`; it only runs with `?demo`, and it must work both ways (scrolling back undoes steps). Step timings in `BuildDemo.tsx` (`STEP_AT`) must match `S`. Never call `.focus()` in demo mode: focusing inside the iframe scrolls the landing page back to it. Sound: `__sgDemo.sound(on)` pauses or resumes the engine's one AudioContext (create audio only through `audio()` in engine.js, so it starts paused while muted); BuildDemo turns sound on only while the section is on screen, so the finished build's buzzer stops when you scroll past.
- `/simulator` (new build) and `/simulator/[id]` (a saved project): the simulator. Account pages are described under "Accounts and saved projects" below.

## Commands

- This app is `apps/simulator` in the StemGrid pnpm monorepo (`Desktop/Stemgrid`). The Astro services site is `apps/web`. Install with `pnpm install` at the repo root.
- `pnpm dev` (in this folder, or `pnpm dev:sim` at the root) starts the dev server at http://localhost:3001. `pnpm dev` at the root runs both apps (services site on :4321).
- `pnpm build` creates a production build and also type-checks. `pnpm start` serves that build.
- There is no linter or test suite. To check a change, test it by hand in the browser.

Three.js is installed from npm and pinned to **0.160.0**; keep it pinned. Poppins loads from Google Fonts by name in `src/app/layout.tsx`. Don't switch it to `next/font`: the simulator draws "Poppins" by name onto canvas textures.

## How the simulator is hosted in Next.js

The simulator is the original imperative Three.js app, ported almost line for line. It is **not** made of React components. It lives in `src/simulator/`:
- `engine.js`: the original module script, wrapped in `startSimulator()`, which returns a `stop()` cleanup function.
- `markup.js` / `styles.js`: the original HTML body and CSS as strings.

`src/simulator/SimulatorHost.tsx` (rendered by `src/app/simulator/page.tsx` and `src/app/simulator/[id]/page.tsx`) is the client component that hosts it. On mount it adds the `<style>` tag, sets the host div's innerHTML, and calls `startSimulator()`. On unmount it calls `stop()` and removes both. The simulator's CSS styles `html`, `body` and every `button` globally, so it must only be on the page while `/simulator` is mounted. Don't import it as a global stylesheet.

Rules for editing `engine.js`:
- Inside `startSimulator()`, the bare `addEventListener(...)` calls go to a local helper that attaches to `window` and records the listener, and `docOn(...)` does the same for `document`. Use these, not `window.addEventListener` or `document.addEventListener` directly, so `stop()` can remove them.
- Anything else global the engine creates (observers, audio, body classes, elements appended to `document.body`) needs undoing in `stop()`. React Strict Mode mounts the page twice in dev, so leftovers show up straight away.
- Images are served from `public/assets/` (`IMG = '/assets/'`).

The original single-file prototype (`index.html`, `assets/`, `server.js`, `Start StemGrid.bat`) is kept in `legacy/` for side-by-side comparison. It is not part of the Next.js app.

## Engine architecture (`src/simulator/engine.js`)

The code is split into sections with `/* ===== SECTION ===== */` banners. Search for the banner text to find each part. In order:

1. **PARTS LIBRARY**: the `LIBRARY` array drives the side nav. Items with `live: true` can be dragged; the others show as "Soon".
2. **Scene setup and helpers**: renderer, camera, lights, and shared helpers: `mesh`, `rbox`, `mat`, `canvasTex` (procedural textures drawn on a canvas), `V`, `damp`.
3. **Module builders**: one `buildXxx(parts)` per module, modelled on the product photos. Small modules share `smallTray`, `trayFoot`, and `trayPort`.
4. **`MODULES` registry**: the central definition table. Each entry has `name`, `foot` (footprint in plate-local units), `ports` (Zap socket positions and pin labels), `build`, and an optional `sim` block. `board: true` marks the Quark controller.
5. **BRAIN (simulation layer)**: a board "sees" every module that is cabled to its ports (`linkedTo`, `boardOf`, `powered`). `simTick` runs about every 0.1 s. It ticks sensors first (`sim.role === 'sensor'`, `sim.readings`), then outputs (`sim.role === 'output'`, `sim.tick(m, {board, sensors}, time)`). Board buttons go through `boardInput` to `sim.input`. **To add a module, write a builder and add a `MODULES` entry with a `sim` block. The simulation core does not need changes.** This section also holds the OLED firmware (boot → menu → app screens in `OLED_SCREENS`) and the 128×64 1-bit drawing primitives.
6. **Scene objects**: the `plates`, `modules`, and `cables` arrays, plus `makePlate`, `makeModule`, `makeCable`, placement and fit queries (`clampOnPlate`, `moduleFits`, snapping to hole centres), and the removal functions.
7. **CABLE GEOMETRY**, **SELECTION + INSPECTOR** (the right-side panel; module `sim.panel` supplies its controls), **ACTIONS**, **POINTER / DRAG ENGINE** (raycast dragging, ghost footprints, dragging from the side nav, keyboard shortcuts), **UI STATE**.
8. **CODE**: a custom interpreter for a Python subset: `pyLex` → `pyParse` → AST → generator-based `pyExec`/`pyEval`. Every statement is a `yield`, so programs can `sleep`, highlight the current line, and loop forever without freezing the page (`PY_BUDGET` steps per frame). Each board runs its own program (`runCode(board)`, `board.prog`). The functions a program can call are defined in `pyApi(board, P)`. `def`, `import`, and f-strings are rejected on purpose with friendly errors. Error messages are written for students, so keep that tone. `CODE_EXAMPLES` fills the examples dropdown.
9. **CONTROLS + LOOP**: wheel and trackpad navigation, then `renderer.setAnimationLoop`. Rendering is **on demand**: a frame is drawn only when the positions in the scene change or `forceFrames > 0`. Code that changes what's on screen without moving anything (materials, textures, emissive values) must call `kick()`, or the change won't appear.

10. **SAVE + LOAD** (just before the end): `serialize()` returns the build as JSON (format v1, documented in the banner comment); `load(data)` rebuilds it with everything snapped into place. Only what a student set is saved: each kind's knobs are listed in `PERSIST`. **If you add engine state worth keeping (a new module knob, say), add it to `PERSIST` and, if it is smoothed, snap it in `load`.** `snapshot()` returns a 480×300 webp of the table for the projects page.

`startSimulator(opts)` returns `{ stop, serialize, load, snapshot, toast, isEmpty }` (types in `engine.d.ts`). `opts.onChange()` fires from `changed()`, code edits and inspector controls. Demo mode never calls it.

## Accounts and saved projects (Supabase)

- The Supabase project is **stemgrid** (ref `otynoieladqnxrhkfhfs`, ap-south-1). Its schema lives in `supabase/migrations/`; apply it with `supabase db push`. Auth settings live in `supabase/config.toml`; apply them with `supabase config push`. (CLI 2.106 fails on the storage section, so set `[storage] enabled = false` temporarily, push, then put it back.)
- Env vars go in `.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus `SUPABASE_DB_PASSWORD` for the CLI. Set `NEXT_PUBLIC_APP_URL` in production so email links point at the right host.
- Tables:
  - `profiles` (one per auth user, created by the `handle_new_user` trigger; `onboarded` flips at the end of `/onboarding`)
  - `projects` (`data` jsonb = `serialize()` output, `thumbnail_path` in the public `thumbnails` bucket)
  - RLS limits every row and storage file (`<uid>/...`) to its owner.
  - RPCs: `username_available`, `delete_my_account`.
- Clients:
  - `src/lib/supabase/client.ts` for the browser.
  - `src/lib/supabase/server.ts` for the server: `getSession()` returns user + profile and is cached per request.
  - Client-side project CRUD and the guest draft store are in `src/lib/projects.ts`.
- `src/proxy.ts` (Next 16's renamed middleware):
  - refreshes the session
  - sends signed-out visitors on `/projects`, `/profile` and `/onboarding` to `/login?next=…`
  - sends signed-in users who haven't onboarded to `/onboarding`
- `src/app/auth/callback/route.ts` swaps the code for a session. Google sign-in, email confirmation and password reset all land there.
- Routes:
  - `(auth)/`: login, signup, forgot-password, reset-password (Server Actions in `actions.ts`, forms in `forms.tsx`)
  - `(app)/`: onboarding, projects, profile
  - These pages share `src/ui/ui.module.css` (landing-page look), `AuthShell`, `AppNav` and `Avatar`. The Google button only shows when the provider is switched on in Supabase (`googleEnabled()` reads `/auth/v1/settings`).
- `/simulator` is a new build; `/simulator/[id]` opens a saved one. Both render `src/simulator/SimulatorHost.tsx`, which owns saving:
  - **Signed in**: autosave about 1.5 s after a change, plus a 5 s poll, because knob drags in 3D don't always call `changed()`. Retries with backoff. Ctrl/⌘+S saves. Thumbnails upload at most every 30 s and on leave. The first change to a new build creates the row and `history.replaceState`s to `/simulator/<id>`.
  - **Guests**: the build is kept in `localStorage['sg:draft']`. Save/Sign in goes to `/login?next=/simulator?claim=1`, and `?claim=1` turns the draft into a project. A plain `/simulator` visit with a draft offers to restore it.
  - The app bar's account menu is a React portal into `#acct`; its styles (`.acct-*`, `.sg-modal`, the `#saveState` pill) are in `styles.js`.
- Before launch, set up custom SMTP in Supabase: the built-in mailer only sends a few emails an hour.

## Conventions

- World units: the base plate is a 16×16 hole grid (`PLATE`). A module's `foot` and `ports` are in its local frame, with the Zap socket at the front (+z).
- Numeric ranges and behaviour are meant to match the real parts (DHT11 range and refresh rate, the servo's 0–180°, the passive buzzer playing any pitch, and so on). Comments cite the brochure or product photos. Keep that realism when changing modules.
- The RGB LED exists only in the simulator. It is not one of the 13 kit modules.

## Hosting and the services site

The simulator deploys on its own to **simulator.stemgrid.in** (subdomain). The services site at stemgrid.in (`apps/web`) has a "Simulator" link in its top bar (`apps/web/src/components/Header.astro`, URL from `PUBLIC_SIMULATOR_URL`, defaulting to `http://localhost:3001` in dev). This landing page links back via `SITE_URL` in `src/app/page.tsx` (`NEXT_PUBLIC_SITE_URL`, defaulting to `http://localhost:4321` in dev).
