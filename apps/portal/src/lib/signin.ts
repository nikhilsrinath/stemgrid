import 'server-only';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { monthKey, monthStart } from '@/lib/dates';

/* The session id inside a Supabase access token (JWT claim `session_id`). */
export function sessionIdOf(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
    return payload.session_id ?? null;
  } catch { return null; }
}

/* One session at a time (brief §7.4): a new sign-in ends the user's other sessions, and the proxy
   signs out any request whose session isn't the latest one. */
export async function finishSignIn(sb: SupabaseClient, session: Session, portalUserId: string | null) {
  await sb.auth.signOut({ scope: 'others' });
  if (portalUserId) {
    await supabaseAdmin().from('portal_users')
      .update({ current_session_id: sessionIdOf(session.access_token), last_login_at: now().toISOString() })
      .eq('id', portalUserId);
  }
}

/* Count the student for this IST month (never decrements). Returns false if the institute's limit is reached. */
export async function countStudent(instituteId: string, studentId: string) {
  const t = now();
  const { data, error } = await supabaseAdmin().rpc('record_active_student', { p_institute: instituteId, p_student: studentId, p_month: monthStart(t) });
  if (error) { console.error('[usage]', error.message); return true; }   // don't lock students out over a counting hiccup
  if (data === 'limit_reached') return false;
  (await cookies()).set('sg_m', `${monthKey(t)}:${studentId}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 40 });
  return true;
}

export const MSG = {
  badPin: "That PIN didn't work. Try again, or ask your teacher for a new one.",
  locked: 'Too many tries. Ask your teacher, or wait 15 minutes.',
  limit: "Your institute has reached this month's student limit. Please ask your institute to add more places.",
  otherInstitute: 'This account belongs to a different institute.',
  suspended: "Student sign-in is paused for your institute right now. Please ask your institute.",
  badPassword: "That email and password don't match. Try again, or reset your password.",
};
