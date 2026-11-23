import type { Metadata } from 'next';
import AuthShell from '@/ui/AuthShell';
import { googleEnabled } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from '../forms';

export const metadata: Metadata = { title: 'Sign in · StemGrid Beta' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <AuthShell>
      <LoginForm next={safeNext(one(q.next))} error={one(q.error)?.slice(0, 200)} google={await googleEnabled()} />
    </AuthShell>
  );
}
