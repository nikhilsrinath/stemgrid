import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { addDays, daysBetween, fmtDate } from '@/lib/dates';
import type { Institute } from '@/lib/types';
import { Empty, PageHead, StatusBadge, s } from '@/ui/bits';

/* Paid institutes waiting for training. They go live when staff mark onboarding complete,
   or automatically 7 days after payment. */
export default async function Onboarding() {
  const b = await consoleBase();
  const { data } = await supabaseAdmin().from('institutes').select('*').in('status', ['paid', 'onboarding']).order('paid_at');
  const list = (data ?? []) as Institute[];
  const t = now();
  return (
    <>
      <PageHead title="Onboarding" lead="Paid institutes awaiting training. Each goes live automatically 7 days after payment if not marked complete first." />
      <div className={s.cardTight}>
        <table className={s.table}>
          <thead><tr><th>Institute</th><th>Status</th><th>Paid</th><th>Training</th><th>Auto go-live</th></tr></thead>
          <tbody>{list.map(i => {
            const auto = addDays(new Date(i.paid_at!), 7);
            return (
              <tr key={i.id}><td><Link href={`${b}/institutes/${i.id}`}>{i.name}</Link></td><td><StatusBadge status={i.status} /></td>
                <td>{fmtDate(i.paid_at)}</td><td>{fmtDate(i.training_at)}</td><td>{fmtDate(auto)} ({Math.max(0, daysBetween(t, auto))} days)</td></tr>
            );
          })}</tbody>
        </table>
        {!list.length && <Empty>Nobody is waiting for onboarding.</Empty>}
      </div>
    </>
  );
}
