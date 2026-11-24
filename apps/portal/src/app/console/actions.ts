'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { act, consoleBase, getAuth, requireStaff, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { isLocal } from '@/lib/mode';
import { logActivity } from '@/lib/activity';
import { safeNext } from '@/lib/safe-next';
import { EMAIL_RE, cleanText, slugProblem } from '@/lib/rules';
import { istNoon } from '@/lib/dates';
import * as L from '@/lib/lifecycle';
import type { FormState } from '@/lib/types';

/* ---------------------------------------------------------------- sign in / out */

export async function staffSignIn(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const email = cleanText(fd.get('email'), 160).toLowerCase();
    const password = String(fd.get('password') ?? '');
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new UserError("That email and password don't match.");
    const { data: staff } = await supabaseAdmin().from('staff_users').select('active').eq('id', data.user.id).maybeSingle();
    if (!staff?.active) { await sb.auth.signOut(); throw new UserError('This account is not a StemGrid staff account.'); }
    if (!isLocal()) return { data: { mfa: true } };          // the page continues with TOTP
    redirect(safeNext(String(fd.get('next') ?? ''), `${await consoleBase()}/enquiries`));
  });
}

export async function staffSignOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect(`${await consoleBase()}/login`);
}

/* ---------------------------------------------------------------- enquiries */

export async function approveEnquiry(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const inst = await L.approveInstitute({
      ref: String(fd.get('ref') ?? ''), slug: String(fd.get('slug') ?? ''), waveCode: String(fd.get('wave') ?? ''),
      contactEmail: String(fd.get('email') ?? ''), name: cleanText(fd.get('name'), 120),
    }, actor);
    redirect(`${await consoleBase()}/institutes/${inst.id}?approved=1`);
  });
}

export async function rejectEnquiryAction(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const ref = String(fd.get('ref') ?? '');
    await L.rejectEnquiry(ref, cleanText(fd.get('reason'), 300), fd.get('spam') === 'on', actor);
    redirect(`${await consoleBase()}/enquiries`);
  });
}

/* ---------------------------------------------------------------- institute actions */

export async function instituteAction(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const id = String(fd.get('id') ?? '');
    const op = String(fd.get('op') ?? '');
    const inst = await L.loadInstitute(id);
    let ok = 'Done.';
    switch (op) {
      case 'resend_activation': { const link = await L.sendActivation(inst, actor); ok = `New activation link emailed to ${inst.contact_email} (older links stop working). You can also send it yourself: ${link}`; break; }
      case 'record_payment': {
        const kind = String(fd.get('kind')) as 'joining' | 'monthly' | 'addon';
        if (!['joining', 'monthly', 'addon'].includes(kind)) throw new UserError('Choose what the payment is for.');
        const rupees = Number(String(fd.get('amount') ?? '').replace(/[,₹\s]/g, ''));
        const r = await L.recordManualPayment(inst, { kind, amountPaise: Math.round(rupees * 100), note: cleanText(fd.get('note'), 300) }, actor);
        ok = r.result === 'wave_full' ? 'Payment recorded, but the wave is full: offer the next wave or refund.' : 'Payment recorded.';
        break;
      }
      case 'offer_wave': {
        const r = await L.offerWave(inst, String(fd.get('wave') ?? ''), actor);
        ok = r.result === 'paid' ? 'Place assigned in the new wave.' : r.result === 'wave_full' ? 'That wave is full too.' : 'Wave changed.';
        break;
      }
      case 'refund': {
        // staff refund outside the portal (Razorpay dashboard / bank), then record it here
        const db = supabaseAdmin();
        const { data: pay } = await db.from('payments').select('id').eq('institute_id', inst.id).eq('kind', 'joining').eq('status', 'paid').order('paid_at', { ascending: false }).limit(1).maybeSingle();
        if (!pay || inst.member_number) throw new UserError('Only an unplaced (wave full) joining payment can be marked refunded here.');
        await db.from('payments').update({ status: 'refunded' }).eq('id', pay.id);
        await logActivity({ actor, action: 'payment.refunded', instituteId: inst.id, targetType: 'payment', targetId: pay.id });
        await L.rejectInstitute(inst, 'refunded: wave full', actor);
        ok = 'Marked refunded and closed.';
        break;
      }
      case 'schedule_training': {
        const d = String(fd.get('date') ?? '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new UserError('Pick a training date.');
        await L.scheduleTraining(inst, istNoon(d), actor); ok = 'Training scheduled.'; break;
      }
      case 'onboarding_complete': await L.markOnboardingComplete(inst, actor); ok = 'Onboarding complete: the free period has started.'; break;
      case 'pause': await L.pauseFreePeriod(inst, Number(fd.get('days')), actor); ok = 'Free period paused.'; break;
      case 'change_plan':
        await L.setPlan(inst, { plan: String(fd.get('plan')), extraPacks: Number(fd.get('packs') || 0), extraTeachers: Number(fd.get('teachers') || 0) }, actor);
        ok = 'Plan updated.'; break;
      case 'start_grace': await L.startGrace(inst, actor, cleanText(fd.get('reason'), 200) || 'marked by staff'); break;
      case 'suspend': await L.suspend(inst, actor, cleanText(fd.get('reason'), 200) || 'suspended by staff'); break;
      case 'reactivate': await L.reactivate(inst, actor); break;
      case 'cancel': await L.cancelMembership(inst, actor, cleanText(fd.get('reason'), 300)); break;
      case 'reject': await L.rejectInstitute(inst, cleanText(fd.get('reason'), 300), actor); break;
      case 'change_slug': {
        const slug = String(fd.get('slug') ?? '').trim().toLowerCase();
        const problem = slugProblem(slug) ?? await L.slugTaken(slug);
        if (problem) throw new UserError(problem);
        const db = supabaseAdmin();
        await db.from('slug_history').insert({ slug: inst.slug, institute_id: inst.id });
        const { error } = await db.from('institutes').update({ slug }).eq('id', inst.id);
        if (error) throw new UserError(error.message);
        await logActivity({ actor, action: 'institute.slug_changed', instituteId: inst.id, targetType: 'institute', targetId: inst.id, before: { slug: inst.slug }, after: { slug } });
        ok = `Address changed. Old links to /${inst.slug} now redirect to /${slug}.`;
        break;
      }
      default: throw new UserError('Unknown action.');
    }
    revalidatePath('/', 'layout');
    return { ok };
  });
}

/* ---------------------------------------------------------------- team */

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const name = cleanText(fd.get('name'), 80), email = cleanText(fd.get('email'), 160).toLowerCase();
    const password = String(fd.get('password') ?? '');
    if (name.length < 2) throw new UserError('Enter their name.');
    if (!EMAIL_RE.test(email)) throw new UserError('Enter a valid email.');
    if (password.length < 12) throw new UserError('Use a temporary password of at least 12 characters. They set up TOTP on first sign-in.');
    const db = supabaseAdmin();
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, kind: 'staff' } });
    if (error) throw new UserError(error.message);
    await db.from('staff_users').insert({ id: data.user.id, name, email, active: true });
    await logActivity({ actor, action: 'staff.added', targetType: 'staff', targetId: data.user.id, after: { name, email } });
    revalidatePath('/', 'layout');
    return { ok: `${name} added. Share the temporary password with them privately.` };
  });
}

export async function toggleStaff(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor, staff } = await requireStaff();
    const id = String(fd.get('id') ?? '');
    if (id === staff.id) throw new UserError("You can't deactivate yourself.");
    const db = supabaseAdmin();
    const { data: row } = await db.from('staff_users').select('active, name').eq('id', id).single();
    // (the proxy checks `active` on every console request, so a deactivated account is locked out at once)
    await db.from('staff_users').update({ active: !row?.active }).eq('id', id);
    await logActivity({ actor, action: row?.active ? 'staff.deactivated' : 'staff.activated', targetType: 'staff', targetId: id, after: { name: row?.name } });
    revalidatePath('/', 'layout');
    return { ok: 'Updated.' };
  });
}

export async function currentAal() {
  return (await getAuth()).aal;
}
