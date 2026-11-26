import type { Metadata } from 'next';
import Link from 'next/link';
import AuthSplit from '@/ui/AuthSplit';
import { getSession } from '@/lib/supabase/server';
import a from '@/ui/auth.module.css';
import { ResetForm } from '../forms';
import { PASSWORD_ASIDE } from '../asides';

export const metadata: Metadata = { title: 'Pick a new password · StemGrid' };

/* Reached from the reset email via /auth/callback, which signs the user in first. */
export default async function ResetPasswordPage() {
  const { user } = await getSession();
  return (
    <AuthSplit aside={PASSWORD_ASIDE(user ? 2 : 0)}>
      {user ? <ResetForm /> : (
        <>
          <h1 className={a.h1}>That link has expired</h1>
          <p className={a.sub}>Password links only work once and for a short time. Ask for a new one.</p>
          <Link href="/forgot-password" className={`${a.btn} ${a.block}`}>Send me a new link</Link>
        </>
      )}
    </AuthSplit>
  );
}
