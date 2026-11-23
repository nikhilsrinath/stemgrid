import type { Metadata } from 'next';
import AuthShell from '@/ui/AuthShell';
import { googleEnabled } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';
import { SignupForm } from '../forms';

export const metadata: Metadata = { title: 'Create an account · StemGrid Beta' };

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const q = await searchParams;
  const next = Array.isArray(q.next) ? q.next[0] : q.next;
  return (
    <AuthShell>
      <SignupForm next={safeNext(next)} google={await googleEnabled()} />
    </AuthShell>
  );
}
