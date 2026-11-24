import type { Metadata } from 'next';
import { googleEnabled } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';
import { SignupFlow } from '../forms';

export const metadata: Metadata = { title: 'Create an account · StemGrid Beta' };

/* /signup for individuals, /signup?as=institution for schools and organisations. */
export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <SignupFlow
      next={safeNext(one(q.next))}
      google={await googleEnabled()}
      initial={one(q.as) === 'institution' ? 'institution' : 'individual'}
    />
  );
}
