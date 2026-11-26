import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import { CARD_COLUMNS, type TutorialCard } from '@/lib/tutorials';
import AppNav from '@/ui/AppNav';
import s from '@/ui/ui.module.css';
import Gallery, { type Progress } from './Gallery';

export const metadata: Metadata = { title: 'TinkerAI · StemGrid Beta' };

/* TinkerAI: guided tutorials. Picking one opens /simulator?tutorial=<slug>, where the tutor
   walks the student through it step by step. Tutorials are rows in Supabase, edited on the console. */
export default async function TinkerAIPage() {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/login?next=/tinkerai');
  const viewer = toViewer(user, profile)!;

  const [{ data, error }, { data: prog }] = await Promise.all([
    supabase.from('tutorials').select(`${CARD_COLUMNS}, steps`).order('sort').order('title').returns<(TutorialCard & { steps: unknown[] })[]>(),
    supabase.from('tutorial_progress').select('tutorial_id, step, completed_at'),
  ]);
  const cards = (data ?? []).map(({ steps, ...c }) => ({ ...c, stepCount: Array.isArray(steps) ? steps.length : 0 }));
  const progress: Record<string, Progress> = {};
  for (const p of prog ?? []) progress[p.tutorial_id] = { step: p.step, done: !!p.completed_at };

  return (
    <div className={`${s.root} ${s.app}`}>
      <AppNav viewer={viewer} />
      <main className={s.wrap}>
        <Gallery tutorials={cards} progress={progress} loadError={!!error} />
      </main>
    </div>
  );
}
