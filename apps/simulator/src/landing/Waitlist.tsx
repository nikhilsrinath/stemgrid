'use client';

/* Waitlist sign-up. Posts { email } to /api/waitlist. */

import { useState, type FormEvent } from 'react';
import s from '../app/landing.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Waitlist() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL.test(v)) {
      setState('error'); setMsg('That doesn’t look like an email address. Check it and try again.');
      return;
    }
    setState('sending'); setMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('done'); setMsg(`You’re on the list. We’ll email ${v} when it’s ready.`);
    } catch {
      setState('error'); setMsg('We couldn’t add you just now. Try again in a minute.');
    }
  };

  if (state === 'done') return <p className={s.wlDone} role="status">{msg}</p>;

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.srOnly} htmlFor="wl-email">Email address</label>
      <input
        id="wl-email" type="email" name="email" autoComplete="email" placeholder="you@example.com"
        value={email} onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
        aria-invalid={state === 'error'} aria-describedby="wl-msg" required
      />
      <button type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Joining…' : 'Join the waitlist'}</button>
      <p id="wl-msg" className={s.wlErr} role="alert">{state === 'error' ? msg : ''}</p>
    </form>
  );
}
