import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

/* Lands here from Google sign-in, the "confirm your email" link and the password-reset link.
   Swaps the one-time code for a session, then sends the user on. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'), '/projects');
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const err = url.searchParams.get('error_description');
  if (err) return back(`/login?error=${encodeURIComponent(err)}`);
  if (!code) return back('/login?error=' + encodeURIComponent('That link is missing its code. Try signing in again.'));

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return back('/login?error=' + encodeURIComponent('That link has expired or was already used. Sign in again, or ask for a new link.'));
  }
  return back(next);
}
