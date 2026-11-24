import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPricing } from '@/lib/pricing';
import { fmtDate } from '@/lib/dates';
import { inr } from '@/lib/money';
import type { Institute } from '@/lib/types';
import { Meter, PageHead, Stat, StatusBadge, s } from '@/ui/bits';

/* Wave places: paid count per wave, places left, member numbers. */
export default async function Members() {
  const b = await consoleBase();
  const [pricing, { data }] = await Promise.all([
    getPricing(),
    supabaseAdmin().from('institutes').select('*').not('member_number', 'is', null).order('member_number'),
  ]);
  const members = (data ?? []) as Institute[];
  const { data: waiting } = await supabaseAdmin().from('institutes').select('id, name, wave_id').eq('wave_full', true).is('member_number', null);
  return (
    <>
      <PageHead title="Members" lead="20 places: 10 Founding Partners, then 10 Charter Members. A place is taken only when payment is received." />
      <div className={s.grid2} style={{ marginBottom: 16 }}>
        {pricing.waves.map(w => {
          const n = members.filter(m => m.wave_id === w.id).length;
          return (
            <Stat key={w.id} label={w.name} value={`${n} of ${w.places} paid`}
              note={<><Meter value={n} max={w.places} /><span>{Math.max(0, w.places - n)} left · join {inr(w.join_price_paise)} + GST · {w.free_months} months unlimited</span></>} />
          );
        })}
      </div>
      {!!waiting?.length && (
        <p className={s.warnBox} style={{ marginBottom: 16 }}>
          Paid while their wave was full: {waiting.map((w, i) => <span key={w.id}>{i ? ', ' : ''}<Link href={`${b}/institutes/${w.id}`}>{w.name}</Link></span>)}. Offer the next wave or refund.
        </p>
      )}
      <div className={s.cardTight}>
        <table className={s.table}>
          <thead><tr><th className={s.num}>#</th><th>Institute</th><th>Wave</th><th>Paid</th><th>Status</th></tr></thead>
          <tbody>{members.map(m => (
            <tr key={m.id}><td className={s.num}><b>{m.member_number}</b></td><td><Link href={`${b}/institutes/${m.id}`}>{m.name}</Link></td>
              <td>{pricing.wave(m.wave_id)?.name}</td><td>{fmtDate(m.paid_at)}</td><td><StatusBadge status={m.status} /></td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
