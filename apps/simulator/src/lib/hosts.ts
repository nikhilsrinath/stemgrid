/* The two public hosts this app is served on (both point at the same deployment):
   - HOME_URL (stemgrid.in): only the landing page. Every other route redirects to the app host (see proxy.ts).
   - APP_URL (simulator.stemgrid.in): login, signup, the simulator, projects, profile. Sessions live here.
   Both are unset in dev, so everything stays relative on localhost:3001. */
const clean = (u?: string) => (u ?? '').replace(/\/$/, '');

export const APP_URL = clean(process.env.NEXT_PUBLIC_APP_URL);
export const HOME_URL = clean(process.env.NEXT_PUBLIC_HOME_URL);

/* A link into the app (absolute when the app has its own host). */
export const appHref = (path: string) => `${APP_URL}${path}`;

/* The StemGrid home page (the landing). */
export const HOME_HREF = HOME_URL || '/';

const hostOf = (u: string) => { try { return u ? new URL(u).host : ''; } catch { return ''; } };
export const APP_HOST = hostOf(APP_URL);
export const HOME_HOST = hostOf(HOME_URL);
