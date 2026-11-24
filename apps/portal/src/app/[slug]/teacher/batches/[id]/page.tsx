import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { manageableBatches, rosterRows } from '@/lib/students';
import { fmtDateTime } from '@/lib/dates';
import { portalOrigin } from '@/lib/urls';
import { Badge, PageHead, s } from '@/ui/bits';
import { AddStudents, StudentTable } from '@/ui/StudentTools';

export default async function TeacherBatch({ params }: PageProps<'/[slug]/teacher/batches/[id]'>) {
  const { slug, id } = await params;
  const ctx = await pageMember(slug, ['teacher']);
  const mine = await manageableBatches(ctx);
  const batch = mine.find(b => b.id === id);
  if (!batch) notFound();        // not one of this teacher's batches: looks the same as missing
  const rows = await rosterRows(ctx.institute.id, { batchId: id });
  const { data: projects } = rows.length
    ? await supabaseAdmin().from('student_projects').select('id, name, owner_id, updated_at, module_count').in('owner_id', rows.map(r => r.id)).order('updated_at', { ascending: false }).limit(30)
    : { data: [] };
  const names = new Map(rows.map(r => [r.id, r.display_name]));
  const loginUrl = `${portalOrigin()}/${ctx.institute.slug}/login`.replace(/^https?:\/\//, '');
  const opts = mine.map(b => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHead title={batch.name} lead={<>{batch.course || 'No course set'} · {batch.schedule_text || 'No schedule'} · join code <span className={s.mono}>{batch.join_code}</span> {batch.self_join && <Badge tone="blue">self-join on</Badge>}</>}>
        <Link className={s.btnGhost} href={`/${ctx.institute.slug}/teacher/batches`}>My batches</Link>
      </PageHead>
      <div className={s.stack}>
        <AddStudents batches={opts} fixedBatch={{ id: batch.id, name: batch.name }} loginUrl={loginUrl} requireBatch />
        <StudentTable rows={rows} batches={opts} currentBatch={{ id: batch.id, name: batch.name }} loginUrl={loginUrl} canArchive={false} />
        <div className={s.card}>
          <h2 className={s.h2}>Recent student builds</h2>
          <ul className={s.list}>{(projects ?? []).map(p => (
            <li key={p.id}><span><Link href={`/${ctx.institute.slug}/simulator/${p.id}`}>{p.name}</Link> <span className={s.muted}>by {names.get(p.owner_id)}</span></span><span className={`${s.small} ${s.muted}`}>{p.module_count} modules · {fmtDateTime(p.updated_at)}</span></li>
          ))}</ul>
          {!projects?.length && <p className={s.muted}>No builds yet.</p>}
          <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>You can open your students&apos; builds read-only.</p>
        </div>
      </div>
    </>
  );
}
