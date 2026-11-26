import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import type { ProjectSummary } from '@/lib/types';
import AppNav from '@/ui/AppNav';
import s from '@/ui/ui.module.css';
import Projects from './Projects';

export const metadata: Metadata = { title: 'My projects · StemGrid' };

export default async function ProjectsPage({ searchParams }: PageProps<'/projects'>) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/projects');
  const viewer = toViewer(user, profile)!;
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, thumbnail_path, module_count, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .returns<ProjectSummary[]>();
  const msg = (await searchParams).msg;

  return (
    <div className={`${s.root} ${s.app}`}>
      <AppNav viewer={viewer} />
      <main className={s.wrap}>
        <Projects
          uid={user.id}
          firstName={viewer.name.split(' ')[0]}
          initial={data ?? []}
          loadError={!!error}
          renderedAt={Date.now()}
          notice={msg === 'password' ? 'Your new password is saved.' : undefined}
        />
      </main>
    </div>
  );
}
