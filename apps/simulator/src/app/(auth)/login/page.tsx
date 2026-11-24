import type { Metadata } from 'next';
import AuthSplit from '@/ui/AuthSplit';
import { googleEnabled } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from '../forms';
import { LOGIN_ASIDE } from '../asides';

export const metadata: Metadata = { title: 'Sign in · StemGrid Beta' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <AuthSplit aside={LOGIN_ASIDE}>
      <LoginForm next={safeNext(one(q.next))} error={one(q.error)?.slice(0, 200)} google={await googleEnabled()} />
    </AuthSplit>
  );
}
