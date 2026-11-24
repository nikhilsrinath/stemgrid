'use server';

import { redirect } from 'next/navigation';
import { act, getInstituteBySlug, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { now } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { safeNext } from '@/lib/safe-next';
import { EMAIL_RE, PIN_RE, cleanText, pinPassword, studentEmail } from '@/lib/rules';
import { countStudent, finishSignIn, MSG } from '@/lib/signin';
import { hashToken } from '@/lib/tokens';
import { sendMail } from '@/lib/mail';
import { emails } from '@/lib/emails';
import { portalOrigin } from '@/lib/urls';
import { logActivity } from '@/lib/activity';
import { teacherLimit } from '@/lib/pricing';
import { OPEN_STATUSES, ROLE_HOME, type FormState, type PortalUser } from '@/lib/types';

const LOCK_WINDOW_MIN = 15, LOCK_AFTER = 5;

async function openInstitute(slug: string) {
  const inst = await getInstituteBySlug(slug);
  if (!inst || !OPEN_STATUSES.includes(inst.status)) throw new UserError("This institute's portal isn't open.");
  return inst;
}

/* ---------------------------------------------------------------- student: username + PIN */
export async function signInStudent(slug: string, next: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInstitute(slug);
    const username = cleanText(fd.get('username'), 40).toLowerCase();
    const pin = String(fd.get('pin') ?? '').replace(/\s/g, '');
    if (!username || !PIN_RE.test(pin)) throw new UserError('Enter your username and your 6-digit PIN.');
    const db = supabaseAdmin();
    const t = now();

    // 5 failed attempts for this (institute, username) within 15 minutes → refuse for 15 minutes
    const since = addDays(t, -LOCK_WINDOW_MIN / 1440).toISOString();
    const { data: recent } = await db.from('login_attempts').select('success, attempted_at')
      .eq('institute_id', inst.id).eq('username', username).gte('attempted_at', since)
      .order('attempted_at', { ascending: false }).limit(LOCK_AFTER);
    if ((recent ?? []).length >= LOCK_AFTER && recent!.every(r => !r.success)) throw new UserError(MSG.locked);

    const record = (success: boolean) => db.from('login_attempts').insert({ institute_id: inst.id, username, success, attempted_at: t.toISOString() });
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signInWithPassword({ email: studentEmail(username, inst.id), password: pinPassword(pin) });
    if (error || !data.session) { await record(false); throw new UserError(MSG.badPin); }

    const { data: member } = await db.from('portal_users').select('*').eq('id', data.user.id).maybeSingle<PortalUser>();
    const out = async (m: string) => { await sb.auth.signOut({ scope: 'local' }); throw new UserError(m); };
    if (!member || member.institute_id !== inst.id) await out(MSG.otherInstitute);
    if (member!.role !== 'student') await out('Teachers and admins: use the Staff tab.');
    if (member!.status !== 'active') { await record(false); await out("This account isn't active any more. Ask your teacher."); }
    if (inst.status === 'suspended') await out(MSG.suspended);
    if (!(await countStudent(inst.id, member!.id))) await out(MSG.limit);

    await record(true);
    await finishSignIn(sb, data.session, member!.id);
    redirect(safeNext(next, `/${inst.slug}/student/home`, inst.slug));
  });
}

/* ---------------------------------------------------------------- staff: email + password */
export async function signInStaff(slug: string, next: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInstitute(slug);
    const email = cleanText(fd.get('email'), 160).toLowerCase();
    const password = String(fd.get('password') ?? '');
    if (!EMAIL_RE.test(email) || !password) throw new UserError('Enter your email and password.');
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new UserError(MSG.badPassword);
    const { data: member } = await supabaseAdmin().from('portal_users').select('*').eq('id', data.user.id).maybeSingle<PortalUser>();
    const out = async (m: string) => { await sb.auth.signOut({ scope: 'local' }); throw new UserError(m); };
    if (!member) await out("This account doesn't belong to an institute.");
    if (member!.institute_id !== inst.id) await out(MSG.otherInstitute);
    if (member!.role === 'student') await out('Students: use the Student tab with your username and PIN.');
    if (member!.status !== 'active') await out('This account has been deactivated. Ask your institute admin.');
    await finishSignIn(sb, data.session, member!.id);
    redirect(safeNext(next, `/${inst.slug}/${ROLE_HOME[member!.role]}`, inst.slug));
  });
}

export async function signOutPortal(slug: string) {
  const sb = await supabaseServer();
  await sb.auth.signOut({ scope: 'local' });
  redirect(`/${slug}/login`);
}

/* ---------------------------------------------------------------- password reset (admins, teachers) */
export async function requestReset(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInstitute(slug);
    const email = cleanText(fd.get('email'), 160).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new UserError('Enter your email.');
    const done = { ok: 'If that email has an account here, we have sent a reset link. Check your inbox.' };
    const db = supabaseAdmin();
    const { data: member } = await db.from('portal_users').select('id, role, status').eq('institute_id', inst.id).eq('email', email).maybeSingle();
    if (!member || member.role === 'student' || member.status !== 'active') return done;
    const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email });
    if (error || !data.properties?.hashed_token) { console.error('[reset]', error); return done; }
    const link = `${portalOrigin()}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${encodeURIComponent(`/${inst.slug}/reset/update`)}`;
    await sendMail({ to: email, ...emails.reset({ institute: inst.name, link }) });
    return done;
  });
}

export async function setNewPassword(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInstitute(slug);
    const password = String(fd.get('password') ?? '');
    if (password.length < 8) throw new UserError('Use at least 8 characters.');
    if (password !== String(fd.get('password2') ?? '')) throw new UserError("The two passwords don't match.");
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new UserError('This reset link has expired. Ask for a new one.');
    const { data: member } = await supabaseAdmin().from('portal_users').select('*').eq('id', user.id).maybeSingle<PortalUser>();
    if (!member || member.institute_id !== inst.id || member.role === 'student') throw new UserError(MSG.otherInstitute);
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new UserError(error.message);
    const { data: { session } } = await sb.auth.getSession();
    if (session) await finishSignIn(sb, session, member.id);
    await logActivity({ actor: { kind: 'portal', id: member.id, name: member.display_name }, action: 'user.password_reset', instituteId: inst.id, targetType: 'portal_user', targetId: member.id });
    redirect(`/${inst.slug}/${ROLE_HOME[member.role]}`);
  });
}

/* ---------------------------------------------------------------- accept an invite (teacher or admin) */
export async function acceptInvite(slug: string, token: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInstitute(slug);
    const db = supabaseAdmin();
    const { data: inv } = await db.from('invites').select('*').eq('token_hash', hashToken(token)).maybeSingle();
    if (!inv || inv.institute_id !== inst.id || inv.used_at || inv.revoked_at || new Date(inv.expires_at) < now()) throw new UserError('This invite has expired or was already used. Ask your institute admin for a new one.');
    const name = cleanText(fd.get('name'), 80);
    const password = String(fd.get('password') ?? '');
    if (name.length < 2) throw new UserError('Enter your name.');
    if (password.length < 8) throw new UserError('Use at least 8 characters for your password.');
    if (password !== String(fd.get('password2') ?? '')) throw new UserError("The two passwords don't match.");
    if (inv.role === 'teacher') {
      const lim = await teacherLimit(inst.id);
      if (lim != null) {
        const { count } = await db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('role', 'teacher').eq('status', 'active');
        if ((count ?? 0) >= lim) throw new UserError("Your institute has used all its teacher accounts. Ask your admin to add one.");
      }
    }
    // Logins are shared with the simulator: an email that already has a StemGrid account signs in with
    // that account's password (we never overwrite it), then gets linked to this institute.
    const { data: made, error } = await db.auth.admin.createUser({ email: inv.email, password, email_confirm: true, user_metadata: { name } });
    if (error && !/already/i.test(error.message)) throw new UserError(error.message);
    const created = !!made?.user;
    const sb = await supabaseServer();
    const { data: si, error: e3 } = await sb.auth.signInWithPassword({ email: inv.email, password });
    if (e3 || !si.session) {
      throw new UserError(created
        ? "Your account is ready, but we couldn't sign you in. Try signing in."
        : `${inv.email} already has a StemGrid account (for example on the simulator). Enter that account's password, or reset it at simulator.stemgrid.in first.`);
    }
    const uid = si.user.id;
    const { data: other } = await db.from('portal_users').select('institute_id').eq('id', uid).maybeSingle();
    if (other) { await sb.auth.signOut({ scope: 'local' }); throw new UserError('This account already belongs to an institute (an account belongs to one institute only). Ask StemGrid for help.'); }
    const { error: e2 } = await db.from('portal_users').insert({ id: uid, institute_id: inst.id, role: inv.role, display_name: name, email: inv.email, created_by: inv.invited_by });
    if (e2) { await sb.auth.signOut({ scope: 'local' }); if (created) await db.auth.admin.deleteUser(uid); throw new UserError(e2.message); }
    if (inv.batch_id && inv.role === 'teacher') await db.from('batch_teachers').insert({ batch_id: inv.batch_id, teacher_id: uid, institute_id: inst.id });
    await db.from('invites').update({ used_at: now().toISOString() }).eq('token_hash', inv.token_hash);
    await logActivity({ actor: { kind: 'portal', id: uid, name: `${name} (${inv.role})` }, action: created ? 'invite.accepted' : 'invite.accepted_existing_account', instituteId: inst.id, targetType: 'portal_user', targetId: uid, after: { role: inv.role, email: inv.email } });
    await finishSignIn(sb, si.session, uid);
    redirect(`/${inst.slug}/${ROLE_HOME[inv.role as 'teacher' | 'institute_admin']}`);
  });
}
