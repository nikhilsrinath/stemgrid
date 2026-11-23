import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import SimulatorHost from '@/simulator/SimulatorHost';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import type { Project } from '@/lib/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const loadProject = cache(async (id: string) => {
  if (!UUID.test(id)) return { user: null, profile: null, project: null };
  const { supabase, user, profile } = await getSession();
  if (!user) return { user, profile, project: null };
  // RLS: only the owner can read it, so someone else's id looks the same as a missing one
  const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle<Project>();
  return { user, profile, project: data };
});

export async function generateMetadata({ params }: PageProps<'/simulator/[id]'>): Promise<Metadata> {
  const { project } = await loadProject((await params).id);
  return { title: project ? `${project.name} · StemGrid Beta` : 'StemGrid Beta' };
}

/* /simulator/<id>: open one of your saved projects. */
export default async function ProjectPage({ params }: PageProps<'/simulator/[id]'>) {
  const { id } = await params;
  const { user, profile, project } = await loadProject(id);
  if (!user) redirect(`/login?next=${encodeURIComponent(`/simulator/${id}`)}`);
  if (!project) notFound();
  return (
    <SimulatorHost
      viewer={toViewer(user, profile)}
      project={{ id: project.id, name: project.name, data: project.data }}
    />
  );
}
