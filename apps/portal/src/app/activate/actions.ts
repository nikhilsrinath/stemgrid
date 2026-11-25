'use server';

import { createHash } from 'node:crypto';
import { act, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { now } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { hashToken, newOtp } from '@/lib/tokens';
import { sendMail, notifyStaff } from '@/lib/mail';
import { emails } from '@/lib/emails';
import { logActivity } from '@/lib/activity';
import { cleanText } from '@/lib/rules';
import { gstOn, inr } from '@/lib/money';
import { getPricing, joiningQuote } from '@/lib/pricing';
import { loadInstitute, startPayment } from '@/lib/lifecycle';
import { provider } from '@/lib/payments';
import { finishSignIn } from '@/lib/signin';
import type { FormState, Institute } from '@/lib/types';

type Tok = { token_hash: string; institute_id: string; email: string; expires_at: string; used_at: string | null;
  otp_hash: string | null; otp_expires_at: string | null; otp_attempts: number; email_verified_at: string | null; user_id: string | null };

const otpHash = (tokenHash: string, code: string) => createHash('sha256').update(`${tokenHash}:${code}`).digest('hex');

/* The token must be unused, unexpired, and its institute still waiting to join. */
async function load(token: string) {
  const db = supabaseAdmin();
  const { data: t } = await db.from('activation_tokens').select('*').eq('token_hash', hashToken(token)).maybeSingle<Tok>();
  if (!t || t.used_at || new Date(t.expires_at) < now()) throw new UserError('This activation link has expired or was replaced by a newer one. Ask StemGrid for a new link.');
  const inst = await loadInstitute(t.institute_id);
  if (!['approved', 'awaiting_payment'].includes(inst.status)) throw new UserError('This institute is already activated.');
  return { db, t, inst };
}
/* What this institute pays to join: its wave's bundle, or onboarding + the first month of its Standard plan. */
async function quoteFor(inst: Institute) {
  const { data: sub } = await supabaseAdmin().from('subscriptions').select('plan_code').eq('institute_id', inst.id).maybeSingle();
  return joiningQuote(await getPricing(), inst.wave_id, sub?.plan_code);
}
const actor = (inst: Institute, name = 'activation') => ({ kind: 'portal' as const, id: null, name: `${inst.contact_name || name} (activation)` });

export async function sendCode(token: string): Promise<FormState> {
  return act(async () => {
    const { db, t, inst } = await load(token);
    if (t.email_verified_at) return { ok: 'Already verified.' };
    const code = newOtp();
    await db.from('activation_tokens').update({ otp_hash: otpHash(t.token_hash, code), otp_expires_at: addDays(now(), 10 / 1440).toISOString(), otp_attempts: 0 }).eq('token_hash', t.token_hash);
    if (!(await sendMail({ to: t.email, ...emails.otp({ code, name: inst.name }) }))) throw new UserError("We couldn't send the email just now. Please try again in a minute, or contact StemGrid.");
    return { ok: `We sent a 6-digit code to ${t.email}.` };
  });
}

export async function verifyCode(token: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { db, t, inst } = await load(token);
    const code = String(fd.get('code') ?? '').replace(/\D/g, '');
    if (!t.otp_hash || !t.otp_expires_at || new Date(t.otp_expires_at) < now()) throw new UserError('That code has expired. Send a new one.');
    if (t.otp_attempts >= 5) throw new UserError('Too many wrong codes. Send a new one.');
    if (otpHash(t.token_hash, code) !== t.otp_hash) {
      await db.from('activation_tokens').update({ otp_attempts: t.otp_attempts + 1 }).eq('token_hash', t.token_hash);
      throw new UserError("That code didn't match. Check the email and try again.");
    }
    await db.from('activation_tokens').update({ email_verified_at: now().toISOString(), otp_hash: null }).eq('token_hash', t.token_hash);
    await logActivity({ actor: actor(inst), action: 'activation.email_verified', instituteId: inst.id, after: { email: t.email } });
    return { ok: 'Email verified.' };
  });
}

export async function createAccount(token: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { db, t, inst } = await load(token);
    if (!t.email_verified_at) throw new UserError('Verify your email first.');
    const name = cleanText(fd.get('name'), 80);
    const password = String(fd.get('password') ?? '');
    if (name.length < 2) throw new UserError('Enter your name.');
    if (password.length < 8) throw new UserError('Use at least 8 characters for your password.');
    if (password !== String(fd.get('password2') ?? '')) throw new UserError("The two passwords don't match.");

    // Logins are shared with the simulator (one Supabase project). If this email already has a StemGrid
    // account there, the admin signs in with that password: we never overwrite someone's password.
    const sb = await supabaseServer();
    let uid = t.user_id;
    let created = false;
    if (!uid) {
      const { data, error } = await db.auth.admin.createUser({ email: t.email, password, email_confirm: true, user_metadata: { name } });
      if (error && !/already/i.test(error.message)) throw new UserError(error.message);
      if (data?.user) { uid = data.user.id; created = true; }
    }
    const { data: si, error: e3 } = await sb.auth.signInWithPassword({ email: t.email, password });
    if (e3 || !si.session) {
      throw new UserError(created
        ? "Your account is ready, but we couldn't sign you in. Try again."
        : `${t.email} already has a StemGrid account (for example on the simulator). Enter that account's password, or reset it at simulator.stemgrid.in first.`);
    }
    uid = si.user.id;
    if (!t.user_id) {
      const { data: other } = await db.from('portal_users').select('institute_id').eq('id', uid).maybeSingle();
      if (other && other.institute_id !== inst.id) { await sb.auth.signOut({ scope: 'local' }); throw new UserError('This account already belongs to another institute. Use a different email, or contact StemGrid.'); }
      if (!other) {
        const { error: e2 } = await db.from('portal_users').insert({ id: uid, institute_id: inst.id, role: 'institute_admin', display_name: name, email: t.email });
        if (e2) { if (created) await db.auth.admin.deleteUser(uid); throw new UserError(e2.message); }
      }
      await db.from('activation_tokens').update({ user_id: uid }).eq('token_hash', t.token_hash);
      await logActivity({ actor: { kind: 'portal', id: uid, name: `${name} (institute_admin)` }, action: created ? 'activation.admin_created' : 'activation.admin_linked', instituteId: inst.id, targetType: 'portal_user', targetId: uid });
    }
    await finishSignIn(sb, si.session, uid);
    return { ok: 'Account created.' };
  });
}

export async function acceptTerms(token: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { db, t, inst } = await load(token);
    if (!t.user_id) throw new UserError('Create your account first.');
    if (fd.get('terms') !== 'on') throw new UserError('Please accept the membership terms.');
    if (fd.get('consent') !== 'on') throw new UserError('Please confirm the parental consent declaration.');
    const patch = {
      address: cleanText(fd.get('address'), 400), city: cleanText(fd.get('city'), 80) || inst.city,
      state: cleanText(fd.get('state'), 80) || inst.state, gst_number: cleanText(fd.get('gst'), 20).toUpperCase(),
      terms_version_accepted: process.env.TERMS_VERSION ?? 'unversioned', terms_accepted_at: now().toISOString(), consent_declared_at: now().toISOString(),
    };
    if (!patch.state) throw new UserError('Enter your state (needed for the GST invoice).');
    await db.from('institutes').update(patch).eq('id', inst.id);
    await logActivity({ actor: { kind: 'portal', id: t.user_id, name: 'Institute admin' }, action: 'activation.terms_accepted', instituteId: inst.id, after: { terms_version: patch.terms_version_accepted, consent: true } });
    return { ok: 'Thank you.' };
  });
}

/* No online payment configured: finish activation and let StemGrid collect the payment offline. */
export async function finishWithoutPayment(token: string): Promise<FormState> {
  return act(async () => {
    const { inst } = await load(token);
    if (!inst.terms_accepted_at || !inst.consent_declared_at) throw new UserError('Accept the terms first.');
    const q = await quoteFor(inst);
    await startPayment(inst, actor(inst));
    await notifyStaff(`Activated, awaiting payment: ${inst.name}`,
      `${inst.name} (/${inst.slug}) has verified its email, created its admin account and accepted the terms.\nCollect the ${q.label} joining payment (${inr(q.amount)} + GST = ${inr(q.amount + gstOn(q.amount))}), then use "Record bank transfer" in the console.`);
    return { ok: 'Done.' };
  });
}

/* Creates the joining payment and returns the provider's checkout URL. */
export async function startCheckout(token: string): Promise<FormState> {
  return act(async () => {
    const { db, t, inst } = await load(token);
    if (!inst.terms_accepted_at || !inst.consent_declared_at) throw new UserError('Accept the terms first.');
    const q = await quoteFor(inst);
    if (!(q.amount > 0)) throw new UserError('No package is set for your institute. Contact StemGrid.');
    await startPayment(inst, actor(inst));
    // reuse an open checkout rather than creating a second one
    await db.from('payments').update({ status: 'cancelled' }).eq('institute_id', inst.id).eq('kind', 'joining').eq('status', 'created');
    const amount = q.amount, gst = gstOn(amount);
    const p = provider();
    const { data: pay, error } = await db.from('payments').insert({ institute_id: inst.id, kind: 'joining', amount_paise: amount, gst_paise: gst, provider: p.name, status: 'created' }).select('id').single();
    if (error) throw new UserError(error.message);
    const co = await p.createCheckout({
      paymentId: pay.id, instituteId: inst.id, amountTotalPaise: amount + gst,
      description: `${q.kind === 'wave' ? `${q.label} membership` : q.label}: ${inst.name}`,
      customer: { name: inst.contact_name || inst.name, email: t.email, phone: inst.contact_phone },
      returnPath: `/activate/${token}?payment=${pay.id}`,
    });
    await db.from('payments').update({ provider_order_id: co.orderId }).eq('id', pay.id);
    return { data: { url: co.url } };
  });
}
