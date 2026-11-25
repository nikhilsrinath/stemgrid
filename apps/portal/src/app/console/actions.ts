'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { act, consoleBase, getAuth, requireStaff, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { isLocal } from '@/lib/mode';
import { logActivity, type Actor } from '@/lib/activity';
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
      ref: String(fd.get('ref') ?? ''), slug: String(fd.get('slug') ?? ''), waveCode: String(fd.get('wave') ?? ''), planCode: String(fd.get('plan') ?? ''),
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
        if (!pay || inst.member_number || !inst.wave_full) throw new UserError('Only an unplaced (wave full) joining payment can be marked refunded here.');
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
      case 'onboarding_complete': await L.markOnboardingComplete(inst, actor); ok = inst.wave_id ? 'Onboarding complete: the free period has started.' : 'Onboarding complete: their plan has started.'; break;
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

/* ---------------------------------------------------------------- packages (prices and terms) */

/* "₹3,500" / "3500" / "3,500.50" → paise. Empty → null (or an error when required). */
function paise(v: FormDataEntryValue | null, label: string, required = true): number | null {
  const raw = String(v ?? '').replace(/[,₹\s]/g, '');
  if (!raw) { if (required) throw new UserError(`Enter ${label}.`); return null; }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new UserError(`${label[0].toUpperCase()}${label.slice(1)} must be an amount in rupees.`);
  return Math.round(n * 100);
}
function int(v: FormDataEntryValue | null, label: string, min: number, max: number) {
  const n = Number(String(v ?? '').trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new UserError(`${label} must be a whole number from ${min} to ${max}.`);
  return n;
}
/* A textarea with one item per line → text[]. */
const lines = (v: FormDataEntryValue | null) =>
  String(v ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 30).map(l => l.slice(0, 300));

/* Update (or insert) one pricing row and log before/after. */
async function savePricing(table: string, match: Record<string, string | boolean>, patch: Record<string, unknown>, actor: Actor, action: string, insert = false) {
  const db = supabaseAdmin();
  let q = db.from(table).select('*');
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data: before } = await q.maybeSingle();
  if (!before && !insert) throw new UserError('That item no longer exists. Reload the page.');
  let error;
  if (before) {
    let u = db.from(table).update(patch);
    for (const [k, v] of Object.entries(match)) u = u.eq(k, v);
    ({ error } = await u);
  } else {
    ({ error } = await db.from(table).insert({ ...match, ...patch }));
  }
  if (error) throw new UserError(error.message);
  await logActivity({ actor, action, targetType: table, targetId: Object.values(match).join('/'), before, after: patch });
}

export async function savePackage(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const op = String(fd.get('op') ?? '');
    const db = supabaseAdmin();
    const note = 'New quotes use these prices; existing subscriptions keep the price they were set at.';
    let ok = 'Saved.';
    switch (op) {
      case 'wave': {
        const code = String(fd.get('code') ?? '');
        const { data: w } = await db.from('waves').select('id').eq('code', code).maybeSingle();
        if (!w) throw new UserError('Unknown wave.');
        const name = cleanText(fd.get('name'), 60);
        if (name.length < 2) throw new UserError('Enter the wave name.');
        const places = int(fd.get('places'), 'Places', 0, 1000);
        const { count } = await db.from('institutes').select('id', { count: 'exact', head: true }).eq('wave_id', w.id).not('member_number', 'is', null);
        if (places < (count ?? 0)) throw new UserError(`${count} places are already taken, so places can't go below ${count}.`);
        const first = paise(fd.get('first_month'), 'the first month')!;
        const onboarding = paise(fd.get('onboarding'), 'the onboarding price')!;
        const join = paise(fd.get('join_price'), 'the joining price')!;
        if (join > first + onboarding) throw new UserError('The joining price is more than the first month plus onboarding.');
        const { data: plans } = await db.from('plans').select('code').order('sort');
        const rows = (plans ?? []).map(p => ({
          plan: p.code as string,
          patch: {
            price_paise: paise(fd.get(`price_${p.code}`), `the ${p.code} member price`),
            extra_pack_paise: paise(fd.get(`pack_${p.code}`), `the ${p.code} extra-students price`),
            extra_teacher_paise: paise(fd.get(`teacher_${p.code}`), `the ${p.code} extra-teacher price`),
          },
        }));
        await savePricing('waves', { code }, {
          name, places, first_month_paise: first, onboarding_paise: onboarding, join_price_paise: join,
          bundle_saving_paise: first + onboarding - join,
          free_months: int(fd.get('free_months'), 'Unlimited period', 1, 12), terms: lines(fd.get('terms')),
        }, actor, 'pricing.wave_updated');
        for (const r of rows) await savePricing('wave_prices', { wave_id: w.id, plan_code: r.plan }, r.patch, actor, 'pricing.wave_price_updated', true);
        ok = `${name} saved. ${note}`;
        break;
      }
      case 'plans': {
        const { data: plans } = await db.from('plans').select('code').order('sort');
        const rows = (plans ?? []).map(p => {
          const name = cleanText(fd.get(`name_${p.code}`), 40);
          if (name.length < 2) throw new UserError('Every plan needs a name.');
          return { code: p.code as string, patch: {
            name, student_limit: int(fd.get(`students_${p.code}`), `${name} students`, 1, 100000),
            teacher_limit: int(fd.get(`teachers_${p.code}`), `${name} teachers`, 0, 10000),
            regular_price_paise: paise(fd.get(`price_${p.code}`), `the ${name} price`),
          } };
        });
        for (const r of rows) await savePricing('plans', { code: r.code }, r.patch, actor, 'pricing.plan_updated');
        ok = `Plans saved. ${note}`;
        break;
      }
      case 'addon': {
        const isNew = fd.get('new') === '1';
        const name = cleanText(fd.get('name'), 80);
        if (name.length < 2) throw new UserError('Give the add-on a name.');
        const code = isNew
          ? ('a_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).slice(0, 40)
          : String(fd.get('code') ?? '');
        if (!/^[a-z][a-z0-9_]{1,39}$/.test(code)) throw new UserError('Use letters or digits in the add-on name.');
        if (isNew) {
          const { data: ex } = await db.from('addons').select('code').eq('code', code).maybeSingle();
          if (ex) throw new UserError('An add-on with that name already exists.');
        }
        const price = paise(fd.get('price'), 'the price', false);
        const max = paise(fd.get('price_max'), 'the top of the range', false);
        if (max != null && (price == null || max < price)) throw new UserError('The top of the range must be at least the price.');
        const { data: last } = await db.from('addons').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle();
        await savePricing('addons', { code }, {
          name, price_paise: price, price_max_paise: max,
          unit: cleanText(fd.get('unit'), 60), note: cleanText(fd.get('note'), 300), price_label: cleanText(fd.get('price_label'), 40),
          ...(isNew ? { sort: (last?.sort ?? 0) + 1 } : {}),
        }, actor, isNew ? 'pricing.addon_added' : 'pricing.addon_updated', isNew);
        ok = isNew ? `${name} added.` : `${name} saved.`;
        break;
      }
      case 'addon_delete': {
        const code = String(fd.get('code') ?? '');
        const { data: a } = await db.from('addons').select('*').eq('code', code).maybeSingle();
        if (!a) throw new UserError('That add-on no longer exists.');
        if (a.system) throw new UserError(`${a.name} is used by billing, so it can't be removed. Change its price instead.`);
        const { error } = await db.from('addons').delete().eq('code', code);
        if (error) throw new UserError(error.message);
        await logActivity({ actor, action: 'pricing.addon_removed', targetType: 'addons', targetId: code, before: a });
        ok = `${a.name} removed.`;
        break;
      }
      case 'settings': {
        await savePricing('pricing_settings', { id: true }, {
          annual_paid_months: int(fd.get('annual_paid_months'), 'Annual: months paid', 1, 12),
          minimum_paid_months: int(fd.get('minimum_paid_months'), 'Minimum term', 0, 24),
          price_lock_months: int(fd.get('price_lock_months'), 'Price lock', 0, 120),
          upgrade_note: cleanText(fd.get('upgrade_note'), 600),
          billing_rules: lines(fd.get('billing_rules')),
          standard_terms: lines(fd.get('standard_terms')),
        }, actor, 'pricing.settings_updated', true);
        ok = 'Saved. The minimum term and price lock apply to institutes that go live from now on.';
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
