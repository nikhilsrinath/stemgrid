import 'server-only';
import { headers } from 'next/headers';

/* This site's origin as the browser sees it, for links Supabase sends back (email + OAuth). */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3001';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/* Whether Google sign-in is switched on in Supabase (public settings endpoint, cached 5 min). */
export async function googleEnabled() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      next: { revalidate: 300 },
    });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j?.external?.google;
  } catch {
    return false;
  }
}
