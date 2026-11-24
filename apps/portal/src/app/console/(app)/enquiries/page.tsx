import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { listEnquiries, ENQUIRY_STATUSES, type EnquiryStatus } from '@/lib/enquiries';
import { fmtDate } from '@/lib/dates';
import { Badge, Empty, PageHead, s } from '@/ui/bits';

const TONE: Partial<Record<EnquiryStatus, 'ok' | 'warn' | 'bad' | 'blue' | 'red'>> = { new: 'red', contacted: 'blue', meeting: 'blue', proposal: 'warn', won: 'ok', lost: 'bad', spam: 'bad' };

/* Enquiries submitted on simulator.stemgrid.in/signup?as=institution (read from the simulator project). */
export default async function Enquiries({ searchParams }: PageProps<'/console/enquiries'>) {
  const b = await consoleBase();
  const f = String((await searchParams).status ?? 'open');
  const filter = (f === 'all' ? undefined : f) as EnquiryStatus | 'open' | undefined;
  let rows: Awaited<ReturnType<typeof listEnquiries>> = [];
  let error: string | null = null;
  try { rows = await listEnquiries(filter); } catch (e) { error = e instanceof Error ? e.message : String(e); }

  return (
    <>
      <PageHead title="Enquiries" lead="From the institution form on the simulator site. Approve one to create the institute and send its activation link." />
      <div className={s.seg} style={{ marginBottom: 16 }}>
        {['open', ...ENQUIRY_STATUSES, 'all'].map(k => (
          <Link key={k} href={`${b}/enquiries?status=${k}`} data-on={f === k}>{k[0].toUpperCase() + k.slice(1)}</Link>
        ))}
      </div>
      {error && <p className={s.badBox}>{error}</p>}
      <div className={s.cardTight}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Ref</th><th>Institution</th><th>City</th><th>Contact</th><th>Learners</th><th>Timeline</th><th>Received</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.ref}>
                  <td className={s.mono}><Link href={`${b}/enquiries/${e.ref}`}>{e.ref}</Link></td>
                  <td><Link href={`${b}/enquiries/${e.ref}`}>{e.org_name}</Link><br /><span className={`${s.small} ${s.muted}`}>{e.org_type}</span></td>
                  <td>{e.city}, {e.region}</td>
                  <td>{e.contact_name}<br /><span className={`${s.small} ${s.muted}`}>{e.email}</span></td>
                  <td>{e.learners}</td>
                  <td>{e.timeline}</td>
                  <td>{fmtDate(e.created_at)}</td>
                  <td><Badge tone={TONE[e.status]}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error && <Empty>No enquiries here.</Empty>}
        </div>
      </div>
    </>
  );
}
