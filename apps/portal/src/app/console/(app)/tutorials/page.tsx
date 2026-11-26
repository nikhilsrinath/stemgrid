import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDate } from '@/lib/dates';
import { simulatorOrigin } from '@/lib/urls';
import type { TutorialRow } from '@/lib/tutorials';
import { Badge, Empty, PageHead, s } from '@/ui/bits';

/* TinkerAI tutorials on simulator.stemgrid.in/tinkerai. Published ones show to every student. */
export default async function Tutorials() {
  const b = await consoleBase();
  const { data } = await supabaseAdmin().from('tutorials').select('*').order('sort').order('title');
  const rows = (data ?? []) as TutorialRow[];
  return (
    <>
      <PageHead title="Tutorials" lead={<>Guided projects for TinkerAI in the simulator. Published tutorials show on <a href={`${simulatorOrigin()}/tinkerai`} target="_blank" rel="noreferrer">TinkerAI</a> straight away.</>}>
        <Link className={s.btn} href={`${b}/tutorials/new`}>New tutorial</Link>
      </PageHead>
      <div className={s.cardTight}><div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Tutorial</th><th>Level</th><th>Parts</th><th className={s.num}>Steps</th><th className={s.num}>Order</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} data-dim={!t.published}>
                <td><Link href={`${b}/tutorials/${t.id}`}>{t.title}</Link><br /><span className={`${s.small} ${s.muted}`}>/{t.slug} · {t.minutes} min</span></td>
                <td style={{ textTransform: 'capitalize' }}>{t.level}</td>
                <td className={s.small}>{t.parts.join(', ')}</td>
                <td className={s.num}>{Array.isArray(t.steps) ? t.steps.length : 0}</td>
                <td className={s.num}>{t.sort}</td>
                <td><Badge tone={t.published ? 'ok' : undefined}>{t.published ? 'published' : 'draft'}</Badge></td>
                <td>{fmtDate(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No tutorials yet.</Empty>}
      </div></div>
    </>
  );
}
