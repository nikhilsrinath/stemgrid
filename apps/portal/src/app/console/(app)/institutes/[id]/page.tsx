import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPricing, studentLimit, activeCount } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { daysBetween, fmtDate, fmtDateTime, fmtMonth, isoDay } from '@/lib/dates';
import { inr } from '@/lib/money';
import type { Institute, Subscription } from '@/lib/types';
import { Badge, Empty, Meter, PageHead, Stat, StatusBadge, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { instituteAction } from '../../../actions';

export default async function InstituteDetail({ params, searchParams }: PageProps<'/console/institutes/[id]'>) {
  const { id } = await params;
  const approved = (await searchParams).approved;
  const b = await consoleBase();
  const db = supabaseAdmin();
  const { data: inst } = await db.from('institutes').select('*').eq('id', id).maybeSingle<Institute>();
  if (!inst) notFound();
  const [pricing, { data: sub }, { data: pays }, { data: invs }, { data: log }, { data: hist }, batches, teachers, students, limit, count] = await Promise.all([
    getPricing(),
    db.from('subscriptions').select('*').eq('institute_id', id).maybeSingle<Subscription>(),
    db.from('payments').select('*').eq('institute_id', id).order('created_at', { ascending: false }),
    db.from('invoices').select('id, number, amount_paise, gst_paise, issued_at, payment_id').eq('institute_id', id).order('issued_at', { ascending: false }),
    db.from('activity_log').select('*').eq('institute_id', id).order('at', { ascending: false }).limit(60),
    db.from('usage_months').select('*').eq('institute_id', id).order('month', { ascending: false }).limit(12),
    db.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', id),
    db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', id).eq('role', 'teacher').eq('status', 'active'),
    db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', id).eq('role', 'student').eq('status', 'active'),
    studentLimit(id), activeCount(id),
  ]);
  const wave = pricing.wave(inst.wave_id);
  const plan = pricing.plan(sub?.plan_code);
  const t = now();
  const A = ({ op, children, confirm, label, danger }: { op: string; children?: ReactNode; confirm?: string; label: string; danger?: boolean }) => (
    <ActionForm action={instituteAction} confirm={confirm}>
      <input type="hidden" name="id" value={inst.id} /><input type="hidden" name="op" value={op} />
      {children}
      <Submit className={danger ? s.btnDanger : s.btnGhost}>{label}</Submit>
    </ActionForm>
  );
  const prePay = ['approved', 'awaiting_payment'].includes(inst.status);

  return (
    <>
      <PageHead title={inst.name} lead={<>/{inst.slug} · <StatusBadge status={inst.status} /> {inst.wave_full && <Badge tone="bad">paid while wave full</Badge>}</>}>
        <Link className={s.btnGhost} href={`${b}/institutes`}>All institutes</Link>
      </PageHead>
      {approved && <p className={s.okBox} style={{ marginBottom: 16 }}>Approved. The activation link has been emailed to {inst.contact_email}. To send it yourself (e.g. on WhatsApp), press <b>Resend activation link</b> below: it shows the new link.</p>}

      <div className={s.grid4} style={{ marginBottom: 16 }}>
        <Stat label="Wave" value={wave?.name ?? '—'} note={inst.member_number ? `Member #${inst.member_number}` : 'No place yet'} />
        <Stat label="Active students this month" value={`${count} / ${limit}`} note={<Meter value={count} max={limit} />} />
        <Stat label="Plan" value={plan?.name ?? '—'} note={sub?.price_paise ? `${inr(sub.price_paise)}/month locked${sub.extra_packs ? ` · +${sub.extra_packs} packs` : ''}` : sub?.recommended_plan_code ? `Recommended: ${pricing.plan(sub.recommended_plan_code)?.name}` : undefined} />
        <Stat label="People" value={students.count ?? 0} note={`students · ${teachers.count ?? 0} teachers · ${batches.count ?? 0} batches`} />
      </div>

      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>Profile</h2>
            <table className={s.table}><tbody>
              {([
                ['Contact', `${inst.contact_name} · ${inst.contact_email} · ${inst.contact_phone}`],
                ['Location', [inst.address, inst.city, inst.state].filter(Boolean).join(', ')],
                ['GSTIN', inst.gst_number || '—'], ['Enquiry', inst.enquiry_ref ?? '—'],
                ['Approved', fmtDateTime(inst.approved_at)], ['Paid', fmtDateTime(inst.paid_at)],
                ['Training', fmtDate(inst.training_at)], ['Go-live', fmtDate(inst.go_live_at)],
                ['Free period ends', inst.free_period_ends_at ? `${fmtDate(inst.free_period_ends_at)}${inst.status === 'free_period' ? ` (${daysBetween(t, new Date(inst.free_period_ends_at))} days)` : ''}${inst.free_period_paused_days ? ` · paused ${inst.free_period_paused_days} days` : ''}` : '—'],
                ['Minimum term ends', fmtDate(inst.minimum_term_ends_at)],
                ['Price lock ends', inst.lock_lost ? 'Ended (lapsed)' : fmtDate(inst.lock_ends_at)],
                ['Terms accepted', inst.terms_accepted_at ? `${inst.terms_version_accepted} on ${fmtDate(inst.terms_accepted_at)}` : '—'],
                ['Consent declared', fmtDate(inst.consent_declared_at)],
                ...(inst.grace_started_at ? [['Grace started', fmtDateTime(inst.grace_started_at)]] : []),
              ] as [string, string][]).map(([k, v]) => <tr key={k}><td className={s.muted} style={{ width: 150 }}>{k}</td><td>{v}</td></tr>)}
            </tbody></table>
          </div>

          <div className={s.cardTight}>
            <div style={{ padding: '16px 18px 4px' }}><h2 className={s.h2}>Payments</h2></div>
            <table className={s.table}>
              <thead><tr><th>Date</th><th>Kind</th><th className={s.num}>Amount + GST</th><th>Via</th><th>Status</th></tr></thead>
              <tbody>{(pays ?? []).map(p => (
                <tr key={p.id}><td>{fmtDate(p.paid_at ?? p.created_at)}</td><td>{p.kind}</td><td className={s.num}>{inr(p.amount_paise + p.gst_paise)}</td><td>{p.provider}</td>
                  <td><Badge tone={p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'bad' : undefined}>{p.status}</Badge></td></tr>
              ))}</tbody>
            </table>
            {!pays?.length && <Empty>No payments yet.</Empty>}
            {!!invs?.length && (
              <ul className={s.list} style={{ padding: '0 18px 12px' }}>
                {invs.map(v => <li key={v.id}><span className={s.mono}>{v.number}</span><span>{fmtDate(v.issued_at)} · {inr(v.amount_paise + v.gst_paise)}</span><a className={s.btnLink} href={`/api/invoices/${v.id}`}>PDF</a></li>)}
              </ul>
            )}
          </div>

          <div className={s.cardTight}>
            <div style={{ padding: '16px 18px 4px' }}><h2 className={s.h2}>Usage history</h2></div>
            <table className={s.table}><thead><tr><th>Month</th><th className={s.num}>Active</th><th className={s.num}>Limit</th><th>Plan</th></tr></thead>
              <tbody>{(hist ?? []).map(h => <tr key={h.month}><td>{fmtMonth(h.month)}</td><td className={s.num}>{h.active_count}</td><td className={s.num}>{h.limit_at_time}</td><td>{pricing.plan(h.plan_code)?.name ?? 'Free period'}</td></tr>)}</tbody>
            </table>
            {!hist?.length && <Empty>No finished months yet.</Empty>}
          </div>
        </div>

        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>Actions</h2>
            <div className={s.stack}>
              {prePay && <A op="resend_activation" label="Resend activation link" />}
              {inst.wave_full && !inst.member_number && (
                <>
                  <A op="offer_wave" label="Offer this wave instead">
                    <Field label="Wave"><select className={s.select} name="wave">{pricing.waves.map(w => <option key={w.id} value={w.code}>{w.name}</option>)}</select></Field>
                  </A>
                  <A op="refund" label="Mark refunded and close" danger confirm="Only do this after refunding the payment. Continue?" />
                </>
              )}
              {inst.status === 'paid' && (
                <A op="schedule_training" label="Schedule training">
                  <Field label="Training date"><input className={s.input} type="date" name="date" defaultValue={isoDay(t)} required /></Field>
                </A>
              )}
              {['paid', 'onboarding'].includes(inst.status) && <A op="onboarding_complete" label="Mark onboarding complete (go live)" confirm="Start the free period today?" />}
              {inst.status === 'free_period' && !inst.pause_used && (
                <A op="pause" label="Pause free period (once only)">
                  <Field label="Days (1–30)"><input className={s.input} type="number" name="days" min={1} max={30} defaultValue={14} required /></Field>
                </A>
              )}
              {['free_period', 'active', 'grace', 'suspended'].includes(inst.status) && (
                <A op="change_plan" label="Set plan">
                  <div className={s.formRow}>
                    <Field label="Plan"><select className={s.select} name="plan" defaultValue={sub?.plan_code ?? sub?.recommended_plan_code ?? 'starter'}>{pricing.plans.map(p => <option key={p.code} value={p.code}>{p.name} ({p.student_limit} students)</option>)}</select></Field>
                    <Field label="Extra packs of 10"><input className={s.input} type="number" min={0} name="packs" defaultValue={sub?.extra_packs ?? 0} /></Field>
                    <Field label="Extra teachers"><input className={s.input} type="number" min={0} name="teachers" defaultValue={sub?.extra_teachers ?? 0} /></Field>
                  </div>
                </A>
              )}
              {(prePay || ['active', 'grace', 'suspended'].includes(inst.status)) && (
                <A op="record_payment" label="Record bank transfer">
                  <div className={s.formRow}>
                    <Field label="For"><select className={s.select} name="kind" defaultValue={prePay ? 'joining' : 'monthly'}>
                      {prePay && <option value="joining">Joining</option>}<option value="monthly">Monthly</option><option value="addon">Add-on</option>
                    </select></Field>
                    <Field label="Amount before GST (₹)"><input className={s.input} name="amount" inputMode="decimal" defaultValue={prePay && wave ? wave.join_price_paise / 100 : sub?.price_paise ? sub.price_paise / 100 : ''} required /></Field>
                  </div>
                  <Field label="Reference / note"><input className={s.input} name="note" maxLength={300} placeholder="UTR or bank reference" /></Field>
                </A>
              )}
              {['active', 'free_period'].includes(inst.status) && <A op="start_grace" label="Start grace (payment failed)" confirm="Start the 7-day grace period?" />}
              {['active', 'grace'].includes(inst.status) && <A op="suspend" label="Suspend" danger confirm="Students will be blocked and staff read-only. Continue?" />}
              {['grace', 'suspended'].includes(inst.status) && <A op="reactivate" label="Reactivate" />}
              {inst.status === 'active' && (
                <A op="cancel" label="Cancel membership" danger confirm="Cancel this membership?">
                  <Field label="Reason"><input className={s.input} name="reason" maxLength={300} /></Field>
                </A>
              )}
              {prePay && (
                <A op="reject" label="Reject (before payment)" danger confirm="Reject this institute?">
                  <Field label="Reason"><input className={s.input} name="reason" maxLength={300} /></Field>
                </A>
              )}
              <details className={s.more}>
                <summary>Change portal address</summary>
                <div style={{ marginTop: 10 }}>
                  <A op="change_slug" label="Change address" confirm="Old links will redirect to the new address. Continue?">
                    <Field label="New address" hint="The old one is kept as a redirect and never reused."><input className={s.input} name="slug" defaultValue={inst.slug} required /></Field>
                  </A>
                </div>
              </details>
            </div>
          </div>

          <div className={s.card}>
            <h2 className={s.h2}>Activity</h2>
            <ul className={s.list}>
              {(log ?? []).map(l => (
                <li key={l.id} style={{ alignItems: 'flex-start' }}>
                  <span><b>{l.action}</b><br /><span className={`${s.small} ${s.muted}`}>{l.actor_name || l.actor_kind}{l.after?.status ? ` → ${l.after.status}` : ''}</span></span>
                  <span className={`${s.small} ${s.muted}`}>{fmtDateTime(l.at)}</span>
                </li>
              ))}
            </ul>
            {!log?.length && <Empty>No activity yet.</Empty>}
          </div>
        </div>
      </div>
    </>
  );
}
