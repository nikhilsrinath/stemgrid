import { pageMember } from '@/lib/auth';
import { signThumbs } from '@/lib/thumbs';
import { fmtDateTime } from '@/lib/dates';
import { PageHead } from '@/ui/bits';
import Projects from '@/ui/Projects';

export const metadata = { title: 'My projects · StemGrid' };

export default async function StudentProjects({ params }: PageProps<'/[slug]/student/projects'>) {
  const { sb, user, institute: inst } = await pageMember((await params).slug, ['student']);
  const { data } = await sb.from('student_projects').select('id, name, thumbnail_path, module_count, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false });
  const thumbs = await signThumbs((data ?? []).map(p => p.thumbnail_path));
  const list = (data ?? []).map(p => ({ id: p.id, name: p.name, modules: p.module_count, updated: fmtDateTime(p.updated_at), thumb: p.thumbnail_path ? thumbs.get(p.thumbnail_path) ?? null : null }));
  return (
    <>
      <PageHead title="My projects" lead="Your saved builds. Open, rename, copy or delete them." />
      <Projects slug={inst.slug} owner={{ uid: user.id, instituteId: inst.id }} projects={list} />
    </>
  );
}
