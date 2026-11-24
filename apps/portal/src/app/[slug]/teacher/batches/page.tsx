import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { manageableBatches } from '@/lib/students';
import { Empty, PageHead, s } from '@/ui/bits';

export const metadata = { title: 'My batches · StemGrid' };

export default async function TeacherBatches({ params }: PageProps<'/[slug]/teacher/batches'>) {
  const ctx = await pageMember((await params).slug, ['teacher']);
  const batches = await manageableBatches(ctx);
  const { data: bs } = batches.length
    ? await supabaseAdmin().from('batch_students').select('batch_id').in('batch_id', batches.map(b => b.id)).is('removed_at', null).limit(100000)
    : { data: [] };
  const counts = new Map<string, number>();
  for (const r of bs ?? []) counts.set(r.batch_id, (counts.get(r.batch_id) ?? 0) + 1);
  return (
    <>
      <PageHead title={`Hello, ${ctx.user.display_name.split(' ')[0]}`} lead="Your batches. Open one to see the roster, add students or give a new PIN." />
      {batches.length ? (
        <div className={s.grid3}>
          {batches.map(b => (
            <Link key={b.id} href={`/${ctx.institute.slug}/teacher/batches/${b.id}`} className={s.card} style={{ textDecoration: 'none' }}>
              <h2 className={s.h2} style={{ marginBottom: 4 }}>{b.name}</h2>
              <p className={s.muted}>{b.course || 'No course set'}</p>
              <p className={s.muted}>{b.schedule_text}</p>
              <p style={{ marginTop: 10 }}><b>{counts.get(b.id) ?? 0}</b> students · code <span className={s.mono}>{b.join_code}</span></p>
            </Link>
          ))}
        </div>
      ) : <div className={s.card}><Empty>You don&apos;t have any batches yet. Your institute admin assigns them.</Empty></div>}
    </>
  );
}
