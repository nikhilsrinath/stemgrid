import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { activeCount, getPricing, peakActive, recommendPlan, studentLimit } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { daysBetween, fmtDate, fmtMonth, monthStart } from '@/lib/dates';
import { inr } from '@/lib/money';
import type { Subscription } from '@/lib/types';
import { Badge, Empty, Meter, PageHead, Stat, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { confirmPlanAction } from '../../staff-actions';

export const metadata = { title: 'Billing · StemGrid' };

export default async function Billing({ params }: PageProps<'/[slug]/admin/billing'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const db = supabaseAdmin();
  const t = now();
  const [pricing, { data: sub }, { data: hist }, { data: invs }, count, limit, peak] = await Promise.all([
    getPricing(),
    db.from('subscriptions').select('*').eq('institute_id', inst.id).maybeSingle<Subscription>(),
    db.from('usage_months').select('*').eq('institute_id', inst.id).order('month', { ascending: false }).limit(24),
    db.from('invoices').select('id, number, amount_paise, gst_paise, issued_at, description').eq('institute_id', inst.id).order('issued_at', { ascending: false }),
    activeCount(inst.id), studentLimit(inst.id), peakActive(inst.id, inst.go_live_at),
  ]);
  const wave = pricing.wave(inst.wave_id);
  const plan = pricing.plan(sub?.plan_code);
  const rec = sub?.recommended_plan_code ? { plan: pricing.plan(sub.recommended_plan_code)!, extraPacks: sub.recommended_extra_packs } : recommendPlan(peak, pricing.plans);
  const lastFreeMonth = inst.status === 'free_period' && inst.free_period_ends_at && daysBetween(t, new Date(inst.free_period_ends_at)) <= 30;
  const canChoose = inst.status === 'free_period' && !!sub?.recommended_plan_code;

  return (
    <>
      <PageHead title="Billing" lead="Your membership, prices and invoices. All prices are before 18% GST." />
      <div className={s.grid4} style={{ marginBottom: 16 }}>
        <Stat label="Membership" value={wave?.name ?? '—'} note={inst.member_number ? `Member #${inst.member_number}` : undefined} />
        <Stat label="Plan" value={plan?.name ?? (inst.status === 'free_period' ? 'Free period' : '—')}
          note={plan ? `${plan.student_limit + (sub?.extra_packs ?? 0) * 10} students · ${plan.teacher_limit + (sub?.extra_teachers ?? 0)} teachers · ${inr(sub?.price_paise)}/month` : inst.free_period_ends_at ? `Unlimited until ${fmtDate(inst.free_period_ends_at)}` : 'Starts at go-live'} />
        <Stat label="Price lock" value={inst.lock_lost ? 'Ended' : inst.lock_ends_at ? fmtDate(inst.lock_ends_at) : '—'} note="Your member prices stay while your membership is continuous" />
        <Stat label="Minimum term ends" value={fmtDate(inst.minimum_term_ends_at)} note="3 paid months after the free period" />
      </div>

      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>This month</h2>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{count} <span className={s.muted} style={{ fontSize: 15 }}>of {limit} active students</span></p>
            <Meter value={count} max={limit} />
            <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>A student counts once per calendar month, the first time they sign in. Archiving a student later doesn&apos;t lower the month&apos;s count.</p>
          </div>

          {(lastFreeMonth || sub?.recommended_plan_code) && inst.status === 'free_period' && (
            <div className={s.card}>
              <h2 className={s.h2}>Your plan after the free period</h2>
              <p>Your busiest month so far: <b>{sub?.peak_active ?? peak} active students</b>. We recommend <b>{rec.plan.name}</b>{rec.extraPacks ? ` + ${rec.extraPacks} extra pack${rec.extraPacks > 1 ? 's' : ''} of 10` : ''}.</p>
              {sub?.plan_confirmed_at ? <p className={s.okBox} style={{ marginTop: 10 }}>Confirmed: {plan?.name}. It starts on {fmtDate(inst.free_period_ends_at)}.</p>
                : canChoose ? (
                  <ActionForm action={confirmPlanAction}>
                    <Field label="Choose your plan" hint={`Confirm by ${fmtDate(sub?.recommendation_due_at)} or we'll apply the recommendation. You can choose bigger, not smaller than your usage.`}>
                      <select className={s.select} name="plan" defaultValue={rec.plan.code}>
                        {pricing.plans.filter(p => p.student_limit >= rec.plan.student_limit).map(p => {
                          const wp = pricing.price(inst.wave_id, p.code);
                          return <option key={p.code} value={p.code}>{p.name}: {p.student_limit} students, {p.teacher_limit} teachers · {inr(wp?.price_paise ?? p.regular_price_paise)}/month</option>;
                        })}
                      </select>
                    </Field>
                    <Submit>Confirm plan</Submit>
                  </ActionForm>
                ) : <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>You&apos;ll be asked to confirm in the last month of your free period.</p>}
            </div>
          )}

          <div className={s.card}>
            <h2 className={s.h2}>Your locked member prices{wave ? ` (${wave.name})` : ''}</h2>
            <table className={s.table}>
              <thead><tr><th>Plan</th><th className={s.num}>Students</th><th className={s.num}>Teachers</th><th className={s.num}>Member price</th><th className={s.num}>Regular</th></tr></thead>
              <tbody>{pricing.plans.map(p => {
                const wp = pricing.price(inst.wave_id, p.code);
                return <tr key={p.code}><td>{p.name} {plan?.code === p.code && <Badge tone="ok">yours</Badge>}</td><td className={s.num}>{p.student_limit}</td><td className={s.num}>{p.teacher_limit}</td><td className={s.num}><b>{inr(wp?.price_paise)}</b></td><td className={s.num}><s>{inr(p.regular_price_paise)}</s></td></tr>;
              })}</tbody>
            </table>
            {wave && (() => { const wp = pricing.price(inst.wave_id, 'starter'); return wp && <p className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>Extra students: {inr(wp.extra_pack_paise)} per pack of 10 · Extra teacher account: {inr(wp.extra_teacher_paise)} · per month.</p>; })()}
          </div>

          <div className={s.card}>
            <h2 className={s.h2}>Payment method</h2>
            <p className={s.muted}>AutoPay (UPI or card mandate) arrives in January 2027; we&apos;ll ask you to set it up before your free period ends. Until then StemGrid will contact you about payment.</p>
            <p style={{ marginTop: 8 }}><Badge>{sub?.mandate_status === 'active' ? 'AutoPay active' : 'AutoPay not set up'}</Badge></p>
          </div>
        </div>

        <div className={s.stack}>
          <div className={s.cardTight}>
            <div style={{ padding: '16px 18px 4px' }}><h2 className={s.h2}>Invoices</h2></div>
            <table className={s.table}>
              <thead><tr><th>Number</th><th>Date</th><th className={s.num}>Total</th><th /></tr></thead>
              <tbody>{(invs ?? []).map(v => (
                <tr key={v.id}><td className={s.mono}>{v.number}</td><td>{fmtDate(v.issued_at)}</td><td className={s.num}>{inr(v.amount_paise + v.gst_paise)}</td><td><a className={s.btnLink} href={`/api/invoices/${v.id}`}>Download PDF</a></td></tr>
              ))}</tbody>
            </table>
            {!invs?.length && <Empty>No invoices yet.</Empty>}
          </div>
          <div className={s.cardTight}>
            <div style={{ padding: '16px 18px 4px' }}><h2 className={s.h2}>Usage history</h2></div>
            <table className={s.table}>
              <thead><tr><th>Month</th><th className={s.num}>Active students</th><th className={s.num}>Limit</th><th>Plan</th></tr></thead>
              <tbody>
                <tr><td>{fmtMonth(monthStart(t))} <Badge tone="blue">now</Badge></td><td className={s.num}>{count}</td><td className={s.num}>{limit}</td><td>{plan?.name ?? 'Free period'}</td></tr>
                {(hist ?? []).filter(h => h.month !== monthStart(t)).map(h => (
                  <tr key={h.month}><td>{fmtMonth(h.month)}</td><td className={s.num}>{h.active_count}</td><td className={s.num}>{h.limit_at_time}</td><td>{pricing.plan(h.plan_code)?.name ?? 'Free period'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
