import type { Metadata } from 'next';
import Link from 'next/link';
import AuthShell from '@/ui/AuthShell';
import { getSession } from '@/lib/supabase/server';
import s from '@/ui/ui.module.css';
import { ResetForm } from '../forms';

export const metadata: Metadata = { title: 'Pick a new password · StemGrid Beta' };

/* Reached from the reset email via /auth/callback, which signs the user in first. */
export default async function ResetPasswordPage() {
  const { user } = await getSession();
  return (
    <AuthShell>
      {user ? <ResetForm /> : (
        <>
          <h1 className={s.h1}>That link has expired</h1>
          <p className={s.sub}>Password links only work once and for a short time. Ask for a new one.</p>
          <Link href="/forgot-password" className={`${s.btn} ${s.btnBlock}`}>Send me a new link</Link>
        </>
      )}
    </AuthShell>
  );
}
