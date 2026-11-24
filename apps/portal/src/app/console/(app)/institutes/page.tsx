import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPricing } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { fmtDate, monthStart } from '@/lib/dates';
import { STATUS_LABEL, type Institute, type InstituteStatus, type Subscription } from '@/lib/types';
import { Badge, Empty, PageHead, StatusBadge, s } from '@/ui/bits';

export default async function Institutes({ searchParams }: PageProps<'/console/institutes'>) {
  const b = await consoleBase();
  const sp = await searchParams;
  const status = String(sp.status ?? '');
  const q = String(sp.q ?? '').trim();
  const db = supabaseAdmin();
  let query = db.from('institutes').select('*').order('created_at', { ascending: false }).limit(500);
  if (status) query = query.eq('status', status);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%_,()]/g, '')}%,slug.ilike.%${q.replace(/[%_,()]/g, '')}%`);
  const [{ data: list }, pricing, { data: subs }, { data: usage }] = await Promise.all([
    query, getPricing(),
    db.from('subscriptions').select('institute_id, plan_code'),
    db.from('monthly_active_students').select('institute_id').eq('month', monthStart(now())).limit(100000),
  ]);
  const insts = (list ?? []) as Institute[];
  const plan = new Map((subs as Pick<Subscription, 'institute_id' | 'plan_code'>[] ?? []).map(x => [x.institute_id, x.plan_code]));
  const active = new Map<string, number>();
  for (const u of usage ?? []) active.set(u.institute_id, (active.get(u.institute_id) ?? 0) + 1);

  return (
    <>
      <PageHead title="Institutes" lead="Every approved institute, whatever its status." />
      <form className={s.row} style={{ marginBottom: 16 }}>
        <input className={s.input} style={{ maxWidth: 280 }} name="q" placeholder="Search name or address" defaultValue={q} />
        <select className={s.select} style={{ maxWidth: 220 }} name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as InstituteStatus[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
        </select>
        <button className={s.btnGhost}>Filter</button>
      </form>
      <div className={s.cardTight}><div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Institute</th><th>Status</th><th>Wave</th><th className={s.num}>Member</th><th>Plan</th><th>Free period ends</th><th className={s.num}>Active students (this month)</th></tr></thead>
          <tbody>
            {insts.map(i => (
              <tr key={i.id}>
                <td><Link href={`${b}/institutes/${i.id}`}>{i.name}</Link><br /><span className={`${s.small} ${s.muted}`}>/{i.slug} · {i.city}</span></td>
                <td><StatusBadge status={i.status} />{i.wave_full && <> <Badge tone="bad">wave full</Badge></>}</td>
                <td>{pricing.wave(i.wave_id)?.name ?? '—'}</td>
                <td className={s.num}>{i.member_number ?? '—'}</td>
                <td>{pricing.plan(plan.get(i.id))?.name ?? '—'}</td>
                <td>{fmtDate(i.free_period_ends_at)}</td>
                <td className={s.num}>{active.get(i.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {insts.length === 0 && <Empty>No institutes match.</Empty>}
      </div></div>
    </>
  );
}
