'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ActionForm, Field, Submit } from '@/ui/Form';
import s from '@/ui/ui.module.css';
import { signInStaff, signInStudent } from '../auth-actions';

/* Student / Staff toggle: students use a username + 6-digit PIN, staff an email + password. */
export default function LoginForms({ slug, next, initial }: { slug: string; next: string; initial: 'student' | 'staff' }) {
  const [tab, setTab] = useState(initial);
  return (
    <div className={s.stack}>
      <div className={s.seg} role="tablist" style={{ alignSelf: 'center' }}>
        <button type="button" role="tab" aria-selected={tab === 'student'} data-on={tab === 'student'} onClick={() => setTab('student')}>Student</button>
        <button type="button" role="tab" aria-selected={tab === 'staff'} data-on={tab === 'staff'} onClick={() => setTab('staff')}>Teacher / Admin</button>
      </div>
      {tab === 'student' ? (
        <ActionForm key="student" action={signInStudent.bind(null, slug, next)}>
          <Field label="Username"><input className={s.input} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus /></Field>
          <Field label="PIN" hint="The 6 numbers on your login slip."><input className={s.pinInput} name="pin" type="password" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="current-password" required /></Field>
          <Submit className={`${s.btn} ${s.full}`} pendingText="Signing in…">Sign in</Submit>
          <p className={`${s.small} ${s.muted}`} style={{ textAlign: 'center' }}>New here with a batch code? <Link href={`/${slug}/join`}>Join a batch</Link></p>
        </ActionForm>
      ) : (
        <ActionForm key="staff" action={signInStaff.bind(null, slug, next)}>
          <Field label="Email"><input className={s.input} name="email" type="email" autoComplete="username" required autoFocus /></Field>
          <Field label="Password"><input className={s.input} name="password" type="password" autoComplete="current-password" required /></Field>
          <Submit className={`${s.btn} ${s.full}`} pendingText="Signing in…">Sign in</Submit>
          <p className={`${s.small} ${s.muted}`} style={{ textAlign: 'center' }}><Link href={`/${slug}/reset`}>Forgot your password?</Link></p>
        </ActionForm>
      )}
    </div>
  );
}
