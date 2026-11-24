'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Slip } from '@/lib/students';
import { ActionForm, Field, Submit } from '@/ui/Form';
import s from '@/ui/ui.module.css';
import { selfJoin } from '../actions';
import { signInStudent } from '../../auth-actions';

export default function SelfJoin({ slug, code }: { slug: string; code: string }) {
  const [slip, setSlip] = useState<Slip | null>(null);
  if (slip) {
    return (
      <div className={s.stack}>
        <p className={s.okBox}>Welcome, {slip.name.split(' ')[0]}! Write these down: your PIN is shown only once.</p>
        <div className={s.slip}>
          <dl>
            <dt>Username</dt><dd>{slip.username}</dd>
            <dt>PIN</dt><dd className={s.slipPin}>{slip.pin}</dd>
          </dl>
        </div>
        <ActionForm action={signInStudent.bind(null, slug, `/${slug}/student/home`)}>
          <input type="hidden" name="username" value={slip.username} />
          <Field label="Type your PIN to sign in"><input className={s.pinInput} name="pin" type="password" inputMode="numeric" maxLength={6} required autoFocus /></Field>
          <Submit className={`${s.btn} ${s.full}`}>Sign in</Submit>
        </ActionForm>
      </div>
    );
  }
  return (
    <ActionForm action={selfJoin.bind(null, slug, code)} onDone={st => setSlip((st.data as { slip: Slip }).slip)}>
      <Field label="Your name" hint="First and last name, so your teacher knows who you are."><input className={s.input} name="name" required maxLength={80} autoFocus autoComplete="off" /></Field>
      <Submit className={`${s.btn} ${s.full}`} pendingText="Setting up…">Get my username and PIN</Submit>
      <p className={`${s.small} ${s.muted}`} style={{ textAlign: 'center' }}>Already have an account? <Link href={`/${slug}/login?next=${encodeURIComponent(`/${slug}/join/${code}`)}`}>Sign in instead</Link></p>
    </ActionForm>
  );
}
