import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

/* Email links (password reset) land here: swap the one-time token for a session, then continue. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(url.searchParams.get('next'), '/');
  const dest = url.clone(); dest.search = '';
  if (token_hash && type === 'recovery') {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp({ type, token_hash });
    if (!error) { dest.pathname = next; return NextResponse.redirect(dest); }
  }
  dest.pathname = next.replace(/\/reset\/update$/, '/reset');
  dest.searchParams.set('expired', '1');
  return NextResponse.redirect(dest);
}
