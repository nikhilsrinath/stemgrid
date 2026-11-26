import type { Metadata } from 'next';
import SimulatorHost from '@/simulator/SimulatorHost';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import { TUTORIAL_COLUMNS, type Tutorial } from '@/lib/tutorials';

export const metadata: Metadata = { title: 'New build · StemGrid Beta' };

/* /simulator: a new, unsaved build. Signed-in users' first change creates a project
   (the URL then becomes /simulator/<id>); guests keep a draft in this browser.
   /simulator?tutorial=<slug>: a TinkerAI tutorial (a fresh table, nothing autosaved). */
export default async function NewBuildPage({ searchParams }: PageProps<'/simulator'>) {
  const { supabase, user, profile } = await getSession();
  const slug = (await searchParams).tutorial;
  let tutorial: Tutorial | null = null;
  if (typeof slug === 'string' && slug) {
    const { data } = await supabase.from('tutorials').select(TUTORIAL_COLUMNS).eq('slug', slug).maybeSingle<Tutorial>();
    tutorial = data && Array.isArray(data.steps) && data.steps.length ? data : null;
  }
  // a new key per tutorial, so switching tutorials remounts the simulator
  return <SimulatorHost key={tutorial?.id ?? 'new'} viewer={toViewer(user, profile)} tutorial={tutorial} />;
}
