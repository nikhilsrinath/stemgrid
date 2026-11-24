import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SYSTEM, logActivity } from '@/lib/activity';
import { now } from '@/lib/clock';
import { addDays, daysBetween, istDay, monthStart, prevMonthStart } from '@/lib/dates';
import { sendMail } from '@/lib/mail';
import { emails } from '@/lib/emails';
import * as L from '@/lib/lifecycle';
import type { Institute, Subscription } from '@/lib/types';

/* The daily job (brief §12). Idempotent: safe to run more than once a day. Times in IST.
   Each step catches its own errors so one bad institute doesn't stop the rest. */
export async function runDaily() {
  const db = supabaseAdmin();
  const t = now();
  const log: string[] = [];
  const errors: string[] = [];
  const all = async () => ((await db.from('institutes').select('*')).data ?? []) as Institute[];
  const step = async (name: string, fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`); }
  };

  // 1. Go-live: paid/onboarding institutes paid 7+ days ago
  await step('go-live', async () => {
    for (const i of (await all()).filter(i => ['paid', 'onboarding'].includes(i.status) && i.paid_at && addDays(new Date(i.paid_at), 7) <= t)) {
      await L.goLive(i, SYSTEM, 'institute.go_live_auto'); log.push(`go-live: ${i.slug}`);
    }
  });

  // 2. Free-period end dates are computed at go-live and on pause (lifecycle.ts); nothing to recompute here.

  // 3 + 4. Reminders 14 and 7 days before the end; plan recommendation in the last 30 days, auto-apply after 7 days
  await step('free period', async () => {
    for (const i of (await all()).filter(x => x.status === 'free_period' && x.free_period_ends_at)) {
      const days = daysBetween(t, new Date(i.free_period_ends_at!));
      const sent = new Set(i.reminders_sent);
      for (const d of [14, 7]) {
        const key = `free_end_${d}`;
        if (days <= d && days > 0 && !sent.has(key)) {
          await sendMail({ to: i.contact_email, ...emails.freePeriodReminder({ name: i.name, days, ends: i.free_period_ends_at!, slug: i.slug }) });
          sent.add(key); log.push(`reminder ${d}d: ${i.slug}`);
        }
      }
      if (days <= 30 && !sent.has('recommend')) {
        await L.recommend(i); sent.add('recommend'); log.push(`recommendation: ${i.slug}`);
      }
      if (sent.size !== i.reminders_sent.length) await db.from('institutes').update({ reminders_sent: [...sent] }).eq('id', i.id);
      const { data: sub } = await db.from('subscriptions').select('*').eq('institute_id', i.id).maybeSingle<Subscription>();
      if (sub?.recommended_plan_code && !sub.plan_confirmed_at && !sub.plan_code && sub.recommendation_due_at && new Date(sub.recommendation_due_at) <= t) {
        await L.setPlan(i, { plan: sub.recommended_plan_code, extraPacks: sub.recommended_extra_packs }, SYSTEM, 'subscription.plan_applied');
        log.push(`plan applied: ${i.slug}`);
      }
    }
  });

  // 5. Free period over → active (with a mandate) or grace (without)
  await step('free period end', async () => {
    for (const i of (await all()).filter(x => x.status === 'free_period' && x.free_period_ends_at && new Date(x.free_period_ends_at) <= t)) {
      const out = await L.endFreePeriod(i); log.push(`free period ended: ${i.slug} → ${out.status}`);
    }
  });

  // 6. Grace day 7 → suspended; due date + 30 days → lapsed
  await step('grace', async () => {
    for (const i of (await all())) {
      if (i.status === 'grace' && i.grace_started_at && addDays(new Date(i.grace_started_at), 7) <= t) { await L.suspend(i, SYSTEM); log.push(`suspended: ${i.slug}`); }
    }
    for (const i of (await all())) {
      if (i.status === 'suspended' && i.payment_due_at && addDays(new Date(i.payment_due_at), 30) <= t) { await L.lapse(i, SYSTEM); log.push(`lapsed: ${i.slug}`); }
    }
  });

  // 7. Usage history: previous month on (or after) the 1st (idempotent upsert), plus the current month so far
  await step('usage months', async () => {
    for (const i of (await all()).filter(x => x.paid_at)) {
      await L.writeUsageMonth(i, prevMonthStart(t));
      await L.writeUsageMonth(i, monthStart(t));
    }
    if (istDay(t) === 1) log.push('usage months written');
  });

  // 8. Usage warnings at 80% and 100%, once per month per threshold
  await step('usage warnings', async () => {
    const month = monthStart(t);
    for (const i of (await all()).filter(x => ['free_period', 'active', 'grace'].includes(x.status))) {
      const [{ count }, { data: lim }, { data: sentRows }] = await Promise.all([
        db.from('monthly_active_students').select('student_id', { count: 'exact', head: true }).eq('institute_id', i.id).eq('month', month),
        db.rpc('student_limit', { p_institute: i.id }),
        db.from('usage_alerts').select('threshold').eq('institute_id', i.id).eq('month', month),
      ]);
      const n = count ?? 0, limit = (lim as number) ?? 300;
      const sent = new Set((sentRows ?? []).map(r => r.threshold));
      for (const th of [80, 100]) {
        if (n >= (limit * th) / 100 && !sent.has(th)) {
          await db.from('usage_alerts').insert({ institute_id: i.id, month, threshold: th });
          await sendMail({ to: i.contact_email, ...emails.usageWarning({ name: i.name, pct: th, count: n, limit, slug: i.slug }) });
          log.push(`usage ${th}%: ${i.slug}`);
        }
      }
    }
  });

  // 9. Data deletion 60 days after lapsed/cancelled: personal data and files go; institute (anonymised), payments, invoices stay
  await step('data deletion', async () => {
    for (const i of (await all()).filter(x => ['lapsed', 'cancelled'].includes(x.status) && !x.data_deleted_at)) {
      const since = i.lapsed_at ?? i.cancelled_at;
      if (!since || addDays(new Date(since), 60) > t) continue;
      const { data: users } = await db.from('portal_users').select('id').eq('institute_id', i.id).limit(100000);
      // project thumbnails and the logo
      const { data: thumbs } = await db.storage.from('student-thumbnails').list(i.id, { limit: 1000 });
      for (const owner of thumbs ?? []) {
        const { data: files } = await db.storage.from('student-thumbnails').list(`${i.id}/${owner.name}`, { limit: 1000 });
        if (files?.length) await db.storage.from('student-thumbnails').remove(files.map(f => `${i.id}/${owner.name}/${f.name}`));
      }
      if (i.logo_path) await db.storage.from('institute-logos').remove([i.logo_path]);
      await db.from('student_projects').delete().eq('institute_id', i.id);
      await db.from('batches').delete().eq('institute_id', i.id);
      await db.from('login_attempts').delete().eq('institute_id', i.id);
      await db.from('invites').delete().eq('institute_id', i.id);
      await db.from('activation_tokens').delete().eq('institute_id', i.id);
      for (const u of users ?? []) await db.auth.admin.deleteUser(u.id);   // portal_users rows cascade
      await db.from('institutes').update({ contact_name: '', contact_phone: '', logo_path: null, data_deleted_at: t.toISOString() }).eq('id', i.id);
      await logActivity({ actor: SYSTEM, action: 'institute.data_deleted', instituteId: i.id, after: { users: users?.length ?? 0 } });
      log.push(`data deleted: ${i.slug}`);
    }
  });

  // 10. Expire tokens and invites
  await step('tokens', async () => {
    const iso = t.toISOString();
    await db.from('activation_tokens').update({ used_at: iso }).is('used_at', null).lt('expires_at', iso);
    await db.from('invites').update({ revoked_at: iso }).is('used_at', null).is('revoked_at', null).lt('expires_at', iso);
    await db.from('login_attempts').delete().lt('attempted_at', addDays(t, -30).toISOString());
  });

  return { at: t.toISOString(), done: log, errors };
}
