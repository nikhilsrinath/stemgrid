import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { portalOrigin } from '@/lib/urls';
import { rosterRows } from '@/lib/students';
import { PageHead, s } from '@/ui/bits';
import { AddStudents, StudentTable } from '@/ui/StudentTools';

export const metadata = { title: 'Students · StemGrid' };

export default async function Students({ params, searchParams }: PageProps<'/[slug]/admin/students'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim().slice(0, 60);
  const batch = String(sp.batch ?? '');
  const status = sp.status === 'archived' ? 'archived' : 'active';
  const { data: batches } = await supabaseAdmin().from('batches').select('id, name').eq('institute_id', inst.id).eq('status', 'active').order('name');
  const rows = await rosterRows(inst.id, { q, status, batchId: batch || undefined });
  const loginUrl = `${portalOrigin()}/${inst.slug}/login`.replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title="Students" lead="Students sign in with a username and a 6-digit PIN. Select students to give new PINs, print slips, move or archive them." />
      <div className={s.stack}>
        <AddStudents batches={batches ?? []} loginUrl={loginUrl} openInitially={!!sp.add} />
        <form className={s.row}>
          <input className={s.input} style={{ maxWidth: 260 }} name="q" defaultValue={q} placeholder="Search name or username" />
          <select className={s.select} style={{ maxWidth: 220 }} name="batch" defaultValue={batch}><option value="">All batches</option>{(batches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select className={s.select} style={{ maxWidth: 160 }} name="status" defaultValue={status}><option value="active">Active</option><option value="archived">Archived</option></select>
          <button className={s.btnGhost}>Filter</button>
          {(q || batch || status !== 'active') && <Link className={s.btnLink} href={`/${inst.slug}/admin/students`}>Clear</Link>}
          <span className={s.muted} style={{ marginLeft: 'auto' }}>{rows.length} shown</span>
        </form>
        <StudentTable rows={rows} batches={batches ?? []} loginUrl={loginUrl} canArchive={status === 'active'} detailBase={`/${inst.slug}/admin/students`} />
      </div>
    </>
  );
}
