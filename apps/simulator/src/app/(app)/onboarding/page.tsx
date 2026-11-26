import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import Onboarding, { OnboardingShell } from './Onboarding';

export const metadata: Metadata = { title: 'Welcome · StemGrid' };

export default async function OnboardingPage({ searchParams }: PageProps<'/onboarding'>) {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/onboarding');
  const q = await searchParams;
  const next = safeNext(Array.isArray(q.next) ? q.next[0] : q.next);
  if (profile?.onboarded) redirect(next);
  if (!profile) {
    return (
      <OnboardingShell>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>We couldn&apos;t load your profile</h1>
          <p style={{ margin: '4px 0 0', color: '#71717A' }}>Reload the page in a moment.</p>
        </div>
      </OnboardingShell>
    );
  }
  return <Onboarding profile={profile} next={next} />;
}
