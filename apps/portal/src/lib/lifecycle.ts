import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity, SYSTEM, type Actor } from '@/lib/activity';
import { now } from '@/lib/clock';
import { addDays, addMonths, istDay, monthStart } from '@/lib/dates';
import { sendMail, notifyStaff } from '@/lib/mail';
import { emails } from '@/lib/emails';
import { gstOn, inr } from '@/lib/money';
import { getPricing, peakActive, recommendPlan } from '@/lib/pricing';
import { createInvoice } from '@/lib/invoices';
import { getEnquiry, updateEnquiry } from '@/lib/enquiries';
import { slugProblem, EMAIL_RE } from '@/lib/rules';
import { newToken, hashToken } from '@/lib/tokens';
import { portalOrigin } from '@/lib/urls';
import { UserError } from '@/lib/auth';
import type { Institute, InstituteStatus, Subscription } from '@/lib/types';

/* Every institute status change happens here, through a named function, and writes the activity
   log. UI code never updates institutes.status directly. The database also refuses any
   transition that isn't allowed (institutes_status_guard). */

const db = () => supabaseAdmin();
const iso = (d: Date) => d.toISOString();

export async function loadInstitute(id: string) {
  const { data } = await db().from('institutes').select('*').eq('id', id).maybeSingle<Institute>();
  if (!data) throw new UserError('That institute no longer exists.');
  return data;
}

/* Change status (and other columns) atomically: only if the status is still what we read. */
async function transition(inst: Institute, to: InstituteStatus, patch: Partial<Institute>, actor: Actor, action: string, note?: unknown) {
  const { data, error } = await db().from('institutes')
    .update({ ...patch, status: to }).eq('id', inst.id).eq('status', inst.status)
    .select('*').maybeSingle<Institute>();
  if (error) throw new UserError(error.message);
  if (!data) throw new UserError('Someone else changed this institute just now. Reload and try again.');
  const before: Record<string, unknown> = { status: inst.status };
  for (const k of Object.keys(patch)) before[k] = inst[k as keyof Institute];
  await logActivity({ actor, action, instituteId: inst.id, targetType: 'institute', targetId: inst.id, before, after: { status: to, ...patch, ...(note ? { note } : {}) } });
  return data;
}

async function patchInstitute(inst: Institute, patch: Partial<Institute>, actor: Actor, action: string) {
  const { data, error } = await db().from('institutes').update(patch).eq('id', inst.id).select('*').single<Institute>();
  if (error) throw new UserError(error.message);
  const before: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) before[k] = inst[k as keyof Institute];
  await logActivity({ actor, action, instituteId: inst.id, targetType: 'institute', targetId: inst.id, before, after: patch });
  return data;
}

/* ---------------------------------------------------------------- approval + activation link */

export async function slugTaken(slug: string) {
  const [a, b, c] = await Promise.all([
    db().from('institutes').select('id').eq('slug', slug).maybeSingle(),
    db().from('slug_history').select('slug').eq('slug', slug).maybeSingle(),
    db().from('reserved_slugs').select('slug').eq('slug', slug).maybeSingle(),
  ]);
  if (c.data) return 'That address is reserved. Choose another.';
  if (a.data || b.data) return 'That address is taken (slugs are never reused). Choose another.';
  return null;
}

export async function approveInstitute(p: {
  ref: string; slug: string; waveCode: string; contactEmail: string; name: string;
}, actor: Actor) {
  const slug = p.slug.trim().toLowerCase();
  const problem = slugProblem(slug) ?? await slugTaken(slug);
  if (problem) throw new UserError(problem);
  if (!EMAIL_RE.test(p.contactEmail)) throw new UserError('Enter a valid contact email for the activation link.');
  const enquiry = await getEnquiry(p.ref);
  if (!enquiry) throw new UserError('Enquiry not found.');
  const { data: existing } = await db().from('institutes').select('id, slug').eq('enquiry_ref', p.ref).maybeSingle();
  if (existing) throw new UserError(`This enquiry was already approved as ${existing.slug}.`);
  const pricing = await getPricing();
  const wave = pricing.waveByCode(p.waveCode);
  if (!wave) throw new UserError('Choose the wave to offer.');

  const { data: inst, error } = await db().from('institutes').insert({
    slug, name: p.name.trim() || enquiry.org_name, type: enquiry.org_type, city: enquiry.city, state: enquiry.region,
    contact_name: enquiry.contact_name, contact_email: p.contactEmail.trim().toLowerCase(), contact_phone: enquiry.phone,
    status: 'approved', wave_id: wave.id, enquiry_ref: p.ref, approved_at: iso(now()), approved_by: actor.id ?? null,
  }).select('*').single<Institute>();
  if (error) throw new UserError(error.message.includes('duplicate') ? 'That address is taken. Choose another.' : error.message);

  await logActivity({ actor, action: 'institute.approved', instituteId: inst.id, targetType: 'institute', targetId: inst.id, after: { status: 'approved', slug, wave: wave.code, enquiry_ref: p.ref } });
  await sendActivation(inst, actor, wave.name);
  try {
    await updateEnquiry(p.ref, 'proposal', `approved as ${slug} (${wave.name}) by ${actor.name}`);
  } catch (e) { console.error('[enquiry] status not updated', e); }
  return inst;
}

export async function sendActivation(inst: Institute, actor: Actor, waveName?: string) {
  if (!['approved', 'awaiting_payment'].includes(inst.status)) throw new UserError('Activation links are only for institutes that haven\'t paid yet.');
  const token = newToken();
  // older links stop working
  await db().from('activation_tokens').update({ used_at: iso(now()) }).eq('institute_id', inst.id).is('used_at', null);
  const { error } = await db().from('activation_tokens').insert({
    token_hash: hashToken(token), institute_id: inst.id, email: inst.contact_email, expires_at: iso(addDays(now(), 7)),
  });
  if (error) throw new UserError(error.message);
  const wave = waveName ?? (await getPricing()).wave(inst.wave_id)?.name ?? 'StemGrid membership';
  const link = `${portalOrigin()}/activate/${token}`;
  await sendMail({ to: inst.contact_email, ...emails.activation({ name: inst.name, contactName: inst.contact_name, link, wave }) });
  await logActivity({ actor, action: 'institute.activation_sent', instituteId: inst.id, targetType: 'institute', targetId: inst.id, after: { email: inst.contact_email } });
  return link;
}

export async function rejectEnquiry(ref: string, reason: string, spam: boolean, actor: Actor) {
  await updateEnquiry(ref, spam ? 'spam' : 'lost', `rejected by ${actor.name}${reason ? `: ${reason}` : ''}`);
  await logActivity({ actor, action: spam ? 'enquiry.spam' : 'enquiry.rejected', targetType: 'enquiry', targetId: ref, after: { reason } });
}

export async function rejectInstitute(inst: Institute, reason: string, actor: Actor) {
  const out = await transition(inst, 'rejected', { rejected_reason: reason || null }, actor, 'institute.rejected');
  await db().from('activation_tokens').update({ used_at: iso(now()) }).eq('institute_id', inst.id).is('used_at', null);
  if (inst.enquiry_ref) await updateEnquiry(inst.enquiry_ref, 'lost', `rejected by ${actor.name}${reason ? `: ${reason}` : ''}`).catch(e => console.error(e));
  return out;
}

/* ---------------------------------------------------------------- payment */

export async function startPayment(inst: Institute, actor: Actor) {
  if (inst.status === 'approved') return transition(inst, 'awaiting_payment', {}, actor, 'institute.awaiting_payment');
  return inst;
}

/* Called by the payment webhook, the mock payment page and the console's manual payment, after the
   payments row is marked paid. Safe to call more than once for the same payment. */
export async function recordPayment(paymentId: string, actor: Actor) {
  const { data: pay } = await db().from('payments').select('*').eq('id', paymentId).single();
  if (!pay || pay.status !== 'paid') throw new UserError('That payment is not marked paid.');
  let inst = await loadInstitute(pay.institute_id);
  const pricing = await getPricing();

  if (pay.kind === 'joining') {
    const { data: res, error } = await db().rpc('assign_wave_place', { p_institute: inst.id, p_now: pay.paid_at ?? iso(now()) });
    if (error) throw new UserError(error.message);
    const r = res as { result: 'paid' | 'wave_full' | 'already'; member_number?: number; wave?: string };
    const wave = pricing.wave(inst.wave_id);
    if (r.result === 'wave_full') {
      await logActivity({ actor, action: 'payment.wave_full', instituteId: inst.id, targetType: 'payment', targetId: pay.id, after: { wave: wave?.code } });
      await sendMail({ to: inst.contact_email, ...emails.waveFull({ name: inst.name, wave: wave?.name ?? '' }) });
      await notifyStaff(`Wave full: ${inst.name} paid but no ${wave?.name} place left`, `Offer the next wave or refund. Payment ${pay.id}, ${inr(pay.amount_paise + pay.gst_paise)}.`);
      return { result: 'wave_full' as const };
    }
    if (r.result === 'paid') {
      await logActivity({ actor, action: 'institute.paid', instituteId: inst.id, targetType: 'institute', targetId: inst.id,
        before: { status: inst.status }, after: { status: 'paid', member_number: r.member_number, wave: wave?.code, payment_id: pay.id } });
      inst = await loadInstitute(inst.id);
    }
    const invoice = await createInvoice(pay.id).catch(e => { console.error('[invoice]', e); return null; });
    if (r.result === 'paid') {
      await sendMail({ to: inst.contact_email, ...emails.receipt({ name: inst.name, total: pay.amount_paise + pay.gst_paise, invoice: invoice?.number ?? null, member: inst.member_number, wave: wave?.name ?? '', slug: inst.slug }) });
      await notifyStaff(`New member: ${inst.name} (#${inst.member_number}, ${wave?.name})`, `Paid ${inr(pay.amount_paise + pay.gst_paise)}. Schedule onboarding in the console.`);
      if (inst.enquiry_ref) await updateEnquiry(inst.enquiry_ref, 'won', `paid, member #${inst.member_number} (${wave?.name})`).catch(e => console.error('[enquiry]', e));
    }
    return { result: r.result, member: inst.member_number };
  }

  // monthly or add-on payment: invoice it, and bring a grace/suspended institute back
  await createInvoice(pay.id).catch(e => console.error('[invoice]', e));
  if (inst.status === 'grace' || inst.status === 'suspended') await reactivate(inst, actor, 'payment received');
  if (pay.kind === 'monthly') {
    const { data: sub } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>();
    if (sub) {
      const start = sub.current_period_end ? new Date(sub.current_period_end) : now();
      await db().from('subscriptions').update({ status: 'active', current_period_start: iso(start), current_period_end: iso(addMonths(start, 1)) }).eq('id', sub.id);
    }
  }
  return { result: 'paid' as const };
}

/* A wave-full institute: staff offer another wave (then the existing payment takes a place there). */
export async function offerWave(inst: Institute, waveCode: string, actor: Actor) {
  const wave = (await getPricing()).waveByCode(waveCode);
  if (!wave) throw new UserError('Unknown wave.');
  if (inst.member_number) throw new UserError('This institute already has a place.');
  inst = await patchInstitute(inst, { wave_id: wave.id }, actor, 'institute.wave_offered');
  const { data: pay } = await db().from('payments').select('id').eq('institute_id', inst.id).eq('kind', 'joining').eq('status', 'paid').order('paid_at', { ascending: false }).limit(1).maybeSingle();
  if (pay) return recordPayment(pay.id, actor);
  return { result: 'offered' as const };
}

/* Staff record a bank transfer: same recordPayment() path as the webhook. */
export async function recordManualPayment(inst: Institute, p: { kind: 'joining' | 'monthly' | 'addon'; amountPaise: number; note: string }, actor: Actor) {
  if (p.kind === 'joining' && inst.member_number) throw new UserError('The joining payment is already recorded.');
  if (p.kind === 'joining' && !['approved', 'awaiting_payment'].includes(inst.status)) throw new UserError('This institute is not waiting for a joining payment.');
  if (!(p.amountPaise > 0)) throw new UserError('Enter the amount before GST.');
  const { data: pay, error } = await db().from('payments').insert({
    institute_id: inst.id, kind: p.kind, amount_paise: p.amountPaise, gst_paise: gstOn(p.amountPaise),
    provider: 'manual', status: 'paid', paid_at: iso(now()), note: p.note, recorded_by: actor.id ?? null,
  }).select('id').single();
  if (error) throw new UserError(error.message);
  await logActivity({ actor, action: 'payment.manual', instituteId: inst.id, targetType: 'payment', targetId: pay.id, after: p });
  return recordPayment(pay.id, actor);
}

/* ---------------------------------------------------------------- onboarding, go-live, free period */

export async function scheduleTraining(inst: Institute, at: Date, actor: Actor) {
  if (inst.status === 'onboarding') return patchInstitute(inst, { training_at: iso(at) }, actor, 'institute.training_rescheduled');
  if (inst.status !== 'paid') throw new UserError('Only paid institutes can be scheduled for training.');
  return transition(inst, 'onboarding', { training_at: iso(at) }, actor, 'institute.onboarding');
}

function freePeriodDates(goLive: Date, freeMonths: number, pausedDays: number) {
  const ends = addDays(addMonths(goLive, freeMonths), pausedDays);
  return {
    free_period_ends_at: iso(ends),
    minimum_term_ends_at: iso(addMonths(ends, 3)),
    lock_ends_at: iso(addMonths(ends, 36)),
  };
}

/* Go-live: the day StemGrid marks onboarding complete, or 7 days after payment, whichever is first. */
export async function goLive(inst: Institute, actor: Actor, action = 'institute.go_live') {
  if (!['paid', 'onboarding'].includes(inst.status)) throw new UserError('Only paid or onboarding institutes can go live.');
  const wave = (await getPricing()).wave(inst.wave_id);
  if (!wave) throw new UserError('This institute has no wave.');
  const at = now();
  const out = await transition(inst, 'free_period', { go_live_at: iso(at), ...freePeriodDates(at, wave.free_months, inst.free_period_paused_days) }, actor, action);
  const ends = new Date(out.free_period_ends_at!);
  await db().from('subscriptions').upsert({
    institute_id: inst.id, status: 'pending', billing_day: istDay(addDays(ends, 1)),
  }, { onConflict: 'institute_id' });
  return out;
}
export const markOnboardingComplete = (inst: Institute, actor: Actor) => goLive(inst, actor, 'institute.onboarding_complete');

/* Pause the free period once only, for at most 30 days. */
export async function pauseFreePeriod(inst: Institute, days: number, actor: Actor) {
  if (inst.status !== 'free_period') throw new UserError('Only an institute in its free period can be paused.');
  if (inst.pause_used) throw new UserError('The free period has already been paused once.');
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new UserError('Pause for 1 to 30 days.');
  const wave = (await getPricing()).wave(inst.wave_id)!;
  return patchInstitute(inst, {
    free_period_paused_days: days, pause_used: true,
    ...freePeriodDates(new Date(inst.go_live_at!), wave.free_months, days),
  }, actor, 'institute.free_period_paused');
}

/* ---------------------------------------------------------------- plans */

async function lockedPrice(inst: Institute, planCode: string) {
  const pricing = await getPricing();
  const plan = pricing.plan(planCode);
  if (!plan) throw new UserError('Unknown plan.');
  const wp = pricing.price(inst.wave_id, planCode);
  return { plan, price: !inst.lock_lost && wp ? wp.price_paise : plan.regular_price_paise };
}

export async function setPlan(inst: Institute, p: { plan: string; extraPacks?: number; extraTeachers?: number; confirmed?: boolean }, actor: Actor, action = 'subscription.plan_changed') {
  const { plan, price } = await lockedPrice(inst, p.plan);
  const { data: before } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>();
  const patch = {
    institute_id: inst.id, plan_code: plan.code, price_paise: price,
    extra_packs: Math.max(0, p.extraPacks ?? before?.extra_packs ?? 0),
    extra_teachers: Math.max(0, p.extraTeachers ?? before?.extra_teachers ?? 0),
    ...(p.confirmed ? { plan_confirmed_at: iso(now()) } : {}),
  };
  const { error } = await db().from('subscriptions').upsert(patch, { onConflict: 'institute_id' });
  if (error) throw new UserError(error.message);
  await logActivity({ actor, action, instituteId: inst.id, targetType: 'subscription', targetId: inst.id,
    before: before ? { plan: before.plan_code, extra_packs: before.extra_packs, extra_teachers: before.extra_teachers } : null,
    after: { plan: plan.code, price_paise: price, extra_packs: patch.extra_packs, extra_teachers: patch.extra_teachers } });
}

/* The admin confirms the recommended plan or a bigger one, never smaller than their usage. */
export async function confirmPlan(inst: Institute, planCode: string, actor: Actor) {
  const pricing = await getPricing();
  const plan = pricing.plan(planCode);
  if (!plan) throw new UserError('Choose a plan.');
  const { data: sub } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>();
  const peak = sub?.peak_active ?? await peakActive(inst.id, inst.go_live_at);
  const rec = recommendPlan(peak, pricing.plans);
  const recCap = rec.plan.student_limit + rec.extraPacks * 10;
  if (plan.student_limit < Math.min(peak, recCap)) throw new UserError(`Your busiest month had ${peak} active students, so choose ${rec.plan.name} or bigger.`);
  const packs = plan.code === rec.plan.code ? rec.extraPacks : Math.max(0, Math.ceil((peak - plan.student_limit) / 10));
  await setPlan(inst, { plan: plan.code, extraPacks: packs, confirmed: true }, actor, 'subscription.plan_confirmed');
}

/* Last month of the free period: recommend the smallest plan that covers the peak. */
export async function recommend(inst: Institute, actor: Actor = SYSTEM) {
  const pricing = await getPricing();
  const peak = await peakActive(inst.id, inst.go_live_at);
  const rec = recommendPlan(peak, pricing.plans);
  const due = addDays(now(), 7);
  await db().from('subscriptions').upsert({
    institute_id: inst.id, recommended_plan_code: rec.plan.code, recommended_extra_packs: rec.extraPacks,
    recommendation_due_at: iso(due), peak_active: peak,
  }, { onConflict: 'institute_id' });
  await logActivity({ actor, action: 'subscription.recommended', instituteId: inst.id, targetType: 'subscription', targetId: inst.id, after: { plan: rec.plan.code, extra_packs: rec.extraPacks, peak } });
  await sendMail({ to: inst.contact_email, ...emails.recommendation({ name: inst.name, plan: rec.plan.name, packs: rec.extraPacks, peak, due: iso(due), slug: inst.slug }) });
  return rec;
}

/* ---------------------------------------------------------------- after the free period */

export async function endFreePeriod(inst: Institute, actor: Actor = SYSTEM) {
  if (inst.status !== 'free_period') return inst;
  let { data: sub } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>();
  if (!sub?.plan_code) {
    // no confirmed plan: apply the recommendation (or compute one now)
    const code = sub?.recommended_plan_code ?? (await recommend(inst, actor)).plan.code;
    const { data: s2 } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>();
    await setPlan(inst, { plan: code, extraPacks: s2?.recommended_extra_packs ?? 0 }, actor, 'subscription.plan_applied');
    ({ data: sub } = await db().from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>());
  }
  if (sub?.mandate_status === 'active') {
    const start = new Date(inst.free_period_ends_at!);
    await db().from('subscriptions').update({ status: 'active', current_period_start: iso(start), current_period_end: iso(addMonths(start, 1)) }).eq('id', sub.id);
    return transition(inst, 'active', {}, actor, 'institute.free_period_ended');
  }
  return startGrace(inst, actor, 'no AutoPay mandate when the free period ended');
}

export async function startGrace(inst: Institute, actor: Actor, reason = 'payment failed') {
  if (!['active', 'free_period'].includes(inst.status)) throw new UserError('Grace only starts from an active institute.');
  const t = now();
  const out = await transition(inst, 'grace', { grace_started_at: iso(t), payment_due_at: iso(t) }, actor, 'institute.grace', reason);
  await db().from('subscriptions').update({ status: 'past_due' }).eq('institute_id', inst.id);
  await sendMail({ to: inst.contact_email, ...emails.grace({ name: inst.name, slug: inst.slug }) });
  await notifyStaff(`Payment due: ${inst.name}`, `${inst.name} is in its 7-day grace period (${reason}).`);
  return out;
}

export async function suspend(inst: Institute, actor: Actor, reason = 'grace period over') {
  if (!['grace', 'active'].includes(inst.status)) throw new UserError('Only an active or grace institute can be suspended.');
  const out = await transition(inst, 'suspended', { suspended_at: iso(now()) }, actor, 'institute.suspended', reason);
  await sendMail({ to: inst.contact_email, ...emails.suspended({ name: inst.name }) });
  return out;
}

export async function reactivate(inst: Institute, actor: Actor, reason = 'reactivated by staff') {
  if (!['grace', 'suspended'].includes(inst.status)) throw new UserError('Only a grace or suspended institute can be reactivated.');
  const out = await transition(inst, 'active', { grace_started_at: null, payment_due_at: null, suspended_at: null }, actor, 'institute.reactivated', reason);
  await db().from('subscriptions').update({ status: 'active' }).eq('institute_id', inst.id);
  return out;
}

/* 30 days after the due date: lapsed. The price lock ends for good. */
export async function lapse(inst: Institute, actor: Actor) {
  if (inst.status !== 'suspended') throw new UserError('Only a suspended institute can lapse.');
  return transition(inst, 'lapsed', { lapsed_at: iso(now()), lock_lost: true }, actor, 'institute.lapsed');
}

export async function cancelMembership(inst: Institute, actor: Actor, reason: string) {
  if (inst.status !== 'active') throw new UserError('Only an active institute can be cancelled.');
  if (inst.minimum_term_ends_at && now() < new Date(inst.minimum_term_ends_at)) throw new UserError('The minimum term (3 paid months) has not ended yet.');
  const out = await transition(inst, 'cancelled', { cancelled_at: iso(now()) }, actor, 'institute.cancelled', reason);
  await db().from('subscriptions').update({ status: 'cancelled' }).eq('institute_id', inst.id);
  return out;
}

/* ---------------------------------------------------------------- usage snapshot (daily job) */
export async function writeUsageMonth(inst: Institute, month: string) {
  const { count } = await db().from('monthly_active_students').select('student_id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('month', month);
  const [{ data: lim }, { data: sub }] = await Promise.all([
    db().rpc('student_limit', { p_institute: inst.id }),
    db().from('subscriptions').select('plan_code').eq('institute_id', inst.id).maybeSingle(),
  ]);
  await db().from('usage_months').upsert({ institute_id: inst.id, month, active_count: count ?? 0, limit_at_time: lim ?? 300, plan_code: sub?.plan_code ?? null }, { onConflict: 'institute_id,month' });
}

export { monthStart };
