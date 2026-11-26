import type { Metadata } from 'next';
import SimulatorHost from '@/simulator/SimulatorHost';
import { getSession, supabaseServer } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import { TUTORIAL_COLUMNS, type Tutorial } from '@/lib/tutorials';

export const metadata: Metadata = { title: 'New build · StemGrid' };

/* /simulator: a new, unsaved build. Signed-in users' first change creates a project
   (the URL then becomes /simulator/<id>); guests keep a draft in this browser.
   /simulator?tutorial=<slug>: a TinkerAI tutorial (a fresh table, nothing autosaved). */
export default async function NewBuildPage({ searchParams }: PageProps<'/simulator'>) {
  const slug = (await searchParams).tutorial;
  const sb = await supabaseServer();
  const [{ user, profile }, found] = await Promise.all([
    getSession(),
    typeof slug === 'string' && slug
      ? sb.from('tutorials').select(TUTORIAL_COLUMNS).eq('slug', slug).maybeSingle<Tutorial>().then(r => r.data)
      : null,
  ]);
  const tutorial: Tutorial | null = found && Array.isArray(found.steps) && found.steps.length ? found : null;
  // a new key per tutorial, so switching tutorials remounts the simulator
  return <SimulatorHost key={tutorial?.id ?? 'new'} viewer={toViewer(user, profile)} tutorial={tutorial} />;
}
