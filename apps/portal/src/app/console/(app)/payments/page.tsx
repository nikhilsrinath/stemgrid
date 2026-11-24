import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPricing } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { addDays, fmtDate, fmtDateTime } from '@/lib/dates';
import { inr } from '@/lib/money';
import { Badge, Empty, PageHead, s } from '@/ui/bits';

export default async function Payments() {
  const b = await consoleBase();
  const db = supabaseAdmin();
  const t = now();
  const [{ data: pays }, { data: ending }, { data: grace }, pricing] = await Promise.all([
    db.from('payments').select('*, institutes(name)').order('created_at', { ascending: false }).limit(200),
    db.from('institutes').select('id, name, free_period_ends_at').eq('status', 'free_period').lte('free_period_ends_at', addDays(t, 30).toISOString()).order('free_period_ends_at'),
    db.from('institutes').select('id, name, grace_started_at, status').in('status', ['grace', 'suspended']).order('grace_started_at'),
    getPricing(),
  ]);
  void pricing;
  const total = (pays ?? []).filter(p => p.status === 'paid').reduce((n, p) => n + p.amount_paise + p.gst_paise, 0);
  return (
    <>
      <PageHead title="Payments" lead={`Received so far: ${inr(total)} including GST.`} />
      <div className={s.grid2} style={{ marginBottom: 16 }}>
        <div className={s.card}>
          <h2 className={s.h2}>Free periods ending in 30 days</h2>
          <ul className={s.list}>{(ending ?? []).map(i => <li key={i.id}><Link href={`${b}/institutes/${i.id}`}>{i.name}</Link><span>{fmtDate(i.free_period_ends_at)}</span></li>)}</ul>
          {!ending?.length && <p className={s.muted}>None.</p>}
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Overdue (grace or suspended)</h2>
          <ul className={s.list}>{(grace ?? []).map(i => <li key={i.id}><Link href={`${b}/institutes/${i.id}`}>{i.name}</Link><span>{i.status} since {fmtDate(i.grace_started_at)}</span></li>)}</ul>
          {!grace?.length && <p className={s.muted}>None.</p>}
        </div>
      </div>
      <div className={s.cardTight}><div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>When</th><th>Institute</th><th>Kind</th><th className={s.num}>Taxable</th><th className={s.num}>GST</th><th>Via</th><th>Status</th></tr></thead>
          <tbody>{(pays ?? []).map(p => (
            <tr key={p.id}>
              <td>{fmtDateTime(p.paid_at ?? p.created_at)}</td>
              <td><Link href={`${b}/institutes/${p.institute_id}`}>{(p.institutes as { name: string } | null)?.name ?? '—'}</Link></td>
              <td>{p.kind}</td><td className={s.num}>{inr(p.amount_paise)}</td><td className={s.num}>{inr(p.gst_paise)}</td><td>{p.provider}</td>
              <td><Badge tone={p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'bad' : undefined}>{p.status}</Badge></td>
            </tr>
          ))}</tbody>
        </table>
        {!pays?.length && <Empty>No payments yet.</Empty>}
      </div></div>
    </>
  );
}
