import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import AuthShell from '@/ui/AuthShell';
import s from '@/ui/ui.module.css';
import { signOut } from '../../(auth)/actions';
import Onboarding from './Onboarding';

export const metadata: Metadata = { title: 'Welcome · StemGrid Beta' };

export default async function OnboardingPage({ searchParams }: PageProps<'/onboarding'>) {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/onboarding');
  const q = await searchParams;
  const next = safeNext(Array.isArray(q.next) ? q.next[0] : q.next);
  if (profile?.onboarded) redirect(next);
  if (!profile) {
    return (
      <AuthShell>
        <h1 className={s.h1}>Almost there</h1>
        <p className={s.sub}>We couldn&apos;t load your profile. Reload the page in a moment.</p>
      </AuthShell>
    );
  }
  return (
    <AuthShell wide top={<form action={signOut}><button className={s.linkBtn} style={{ color: 'var(--cream)' }}>Sign out</button></form>}>
      <Onboarding profile={profile} next={next} />
    </AuthShell>
  );
}
