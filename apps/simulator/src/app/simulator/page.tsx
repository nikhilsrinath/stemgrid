import type { Metadata } from 'next';
import SimulatorHost from '@/simulator/SimulatorHost';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'New build · StemGrid Beta' };

/* /simulator: a new, unsaved build. Signed-in users' first change creates a project
   (the URL then becomes /simulator/<id>); guests keep a draft in this browser. */
export default async function NewBuildPage() {
  const { user, profile } = await getSession();
  return <SimulatorHost viewer={toViewer(user, profile)} />;
}
