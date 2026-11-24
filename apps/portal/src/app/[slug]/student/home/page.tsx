import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { signThumbs } from '@/lib/thumbs';
import { fmtDateTime } from '@/lib/dates';
import { Empty, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { joinWithCode } from '../../join/actions';

export const metadata = { title: 'Home · StemGrid' };

export default async function StudentHome({ params }: PageProps<'/[slug]/student/home'>) {
  const { sb, user, institute: inst } = await pageMember((await params).slug, ['student']);
  // the student's own client: RLS shows only their batches and projects
  const [{ data: links }, { data: projects }] = await Promise.all([
    sb.from('batch_students').select('batch_id, batches(name, course, schedule_text, status)').eq('student_id', user.id).is('removed_at', null),
    sb.from('student_projects').select('id, name, thumbnail_path, module_count, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(4),
  ]);
  const thumbs = await signThumbs((projects ?? []).map(p => p.thumbnail_path));
  const batches = (links ?? []).map(l => l.batches as unknown as { name: string; course: string; schedule_text: string; status: string }).filter(b => b?.status === 'active');

  return (
    <>
      <PageHead title={`Hi, ${user.display_name.split(' ')[0]}!`} lead="Build, wire and code the Quark kit in the simulator. Your builds save automatically.">
        <Link className={s.btn} href={`/${inst.slug}/simulator`}>New build</Link>
      </PageHead>
      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>Recent builds</h2>
            {projects?.length ? (
              <div className={s.projects}>
                {projects.map(p => (
                  <Link key={p.id} href={`/${inst.slug}/simulator/${p.id}`} className={s.project} style={{ textDecoration: 'none' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className={s.thumb}>{p.thumbnail_path && thumbs.get(p.thumbnail_path) ? <img src={thumbs.get(p.thumbnail_path)!} alt="" /> : 'No picture yet'}</div>
                    <div className={s.projectBody}><b>{p.name}</b><span className={`${s.small} ${s.muted}`}>{p.module_count} modules · {fmtDateTime(p.updated_at)}</span></div>
                  </Link>
                ))}
              </div>
            ) : <Empty>No builds yet. <Link href={`/${inst.slug}/simulator`}>Start your first one</Link>.</Empty>}
            {!!projects?.length && <p style={{ marginTop: 12 }}><Link href={`/${inst.slug}/student/projects`}>All my projects</Link></p>}
          </div>
        </div>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>My batches</h2>
            <ul className={s.list}>{batches.map(b => <li key={b.name}><span><b>{b.name}</b><br /><span className={`${s.small} ${s.muted}`}>{[b.course, b.schedule_text].filter(Boolean).join(' · ')}</span></span></li>)}</ul>
            {!batches.length && <p className={s.muted}>You&apos;re not in a batch yet.</p>}
          </div>
          <div className={s.card}>
            <h2 className={s.h2}>Got a batch code?</h2>
            <ActionForm action={joinWithCode.bind(null, inst.slug)} resetOnOk>
              <Field label="Batch code"><input className={s.input} name="code" maxLength={6} required style={{ textTransform: 'uppercase', letterSpacing: '.2em' }} /></Field>
              <Submit className={s.btnGhost}>Join batch</Submit>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
