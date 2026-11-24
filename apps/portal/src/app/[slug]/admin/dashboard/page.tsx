import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { activeCount, getPricing, studentLimit } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { daysBetween, fmtDate, fmtDateTime, fmtMonth, monthStart } from '@/lib/dates';
import { inr } from '@/lib/money';
import type { Subscription } from '@/lib/types';
import { Meter, PageHead, Stat, s } from '@/ui/bits';
import { setupState } from '../setup/state';

export const metadata = { title: 'Dashboard · StemGrid' };

export default async function Dashboard({ params }: PageProps<'/[slug]/admin/dashboard'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const db = supabaseAdmin();
  const t = now();
  const [count, limit, pricing, { data: sub }, batches, teachers, students, { data: log }, setup] = await Promise.all([
    activeCount(inst.id), studentLimit(inst.id), getPricing(),
    db.from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>(),
    db.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('status', 'active'),
    db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('role', 'teacher').eq('status', 'active'),
    db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('role', 'student').eq('status', 'active'),
    db.from('activity_log').select('id, action, actor_name, at').eq('institute_id', inst.id).eq('actor_kind', 'portal').order('at', { ascending: false }).limit(8),
    setupState(inst),
  ]);
  const plan = pricing.plan(sub?.plan_code);
  const b = `/${inst.slug}/admin`;
  const pct = limit ? Math.round((count / limit) * 100) : 0;

  let money: React.ReactNode;
  if (inst.status === 'free_period' && inst.free_period_ends_at) {
    const days = daysBetween(t, new Date(inst.free_period_ends_at));
    money = <Stat label="Free period" value={`${Math.max(0, days)} days left`} note={`Unlimited until ${fmtDate(inst.free_period_ends_at)} (fair use: 300 students a month)`} />;
  } else if (['paid', 'onboarding'].includes(inst.status)) {
    money = <Stat label="Free period" value="Starts at go-live" note="When onboarding is complete, or 7 days after payment" />;
  } else {
    money = <Stat label="Next bill" value={sub?.price_paise ? inr(sub.price_paise) : '—'} note={sub?.current_period_end ? `On ${fmtDate(sub.current_period_end)} · ${plan?.name ?? ''} plan, + GST` : plan ? `${plan.name} plan, + GST` : undefined} />;
  }

  return (
    <>
      <PageHead title="Dashboard" lead={`${fmtMonth(monthStart(t))} at ${inst.name}`} />
      {!setup.done && (
        <div className={s.info} style={{ marginBottom: 16 }}>
          <span>Finish setting up: {setup.items.filter(i => !i.done).map(i => i.label.toLowerCase()).join(', ')}. <Link href={`${b}/setup`}>Open the checklist</Link></span>
        </div>
      )}
      {sub?.recommended_plan_code && !sub.plan_confirmed_at && inst.status === 'free_period' && (
        <div className={s.warnBox} style={{ marginBottom: 16 }}>
          <span>We recommend the <b>{pricing.plan(sub.recommended_plan_code)?.name}</b> plan for after your free period. <Link href={`${b}/billing`}>Confirm it</Link> by {fmtDate(sub.recommendation_due_at)}, or it will be applied for you.</span>
        </div>
      )}
      <div className={s.grid3} style={{ marginBottom: 16 }}>
        <Stat label="Active students this month" value={`${count} / ${limit}`} note={<><Meter value={count} max={limit} /><span>{pct}% used. A student counts once a month, the first time they sign in.</span></>} />
        {money}
        <Stat label="People" value={students.count ?? 0} note={`students · ${teachers.count ?? 0} teachers · ${batches.count ?? 0} active batches`} />
      </div>
      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={s.h2}>Quick actions</h2>
          <div className={s.row}>
            <Link className={s.btn} href={`${b}/students?add=1`}>Add students</Link>
            <Link className={s.btnGhost} href={`${b}/batches?new=1`}>New batch</Link>
            <Link className={s.btnGhost} href={`${b}/teachers`}>Invite a teacher</Link>
            <Link className={s.btnGhost} href={`/${inst.slug}/simulator`}>Open simulator</Link>
          </div>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Recent activity</h2>
          <ul className={s.list}>
            {(log ?? []).map(l => <li key={l.id}><span><b>{l.action.replace(/[._]/g, ' ')}</b><br /><span className={`${s.small} ${s.muted}`}>{l.actor_name}</span></span><span className={`${s.small} ${s.muted}`}>{fmtDateTime(l.at)}</span></li>)}
          </ul>
          {!log?.length && <p className={s.muted}>Nothing yet.</p>}
        </div>
      </div>
    </>
  );
}
