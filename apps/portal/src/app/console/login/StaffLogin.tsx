'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { safeNext } from '@/lib/safe-next';
import { staffSignIn } from '../actions';
import { Field, Msg, Submit } from '@/ui/Form';
import s from '@/ui/ui.module.css';

/* Staff sign-in: email + password, then TOTP (Supabase MFA). First sign-in enrols an authenticator
   app with a QR code. Local mode skips TOTP. */
export default function StaffLogin({ next, skipTotp }: { next: string; skipTotp: boolean }) {
  const [state, run] = useActionState(staffSignIn, null);
  const needMfa = !!(state?.data as { mfa?: boolean } | undefined)?.mfa;

  return needMfa ? <Totp next={next} /> : (
    <form action={run} className={s.form}>
      <input type="hidden" name="next" value={next} />
      <Field label="Email"><input className={s.input} name="email" type="email" autoComplete="username" required /></Field>
      <Field label="Password"><input className={s.input} name="password" type="password" autoComplete="current-password" required /></Field>
      <Submit className={`${s.btn} ${s.full}`} pendingText="Signing in…">Sign in</Submit>
      {skipTotp && <p className={`${s.small} ${s.muted}`}>Local mode: the authenticator step is skipped.</p>}
      <Msg state={state} />
    </form>
  );
}

function Totp({ next }: { next: string }) {
  const sb = supabaseBrowser();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) { setErr(error.message); return; }
      const verified = data.totp.find(f => f.status === 'verified');
      if (verified) { setFactorId(verified.id); return; }
      // clear half-finished enrolments, then start a new one
      for (const f of data.all.filter(f => f.status === 'unverified')) await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data: en, error: e2 } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'StemGrid console' });
      if (e2) { setErr(e2.message); return; }
      setFactorId(en.id); setQr(en.totp.qr_code); setSecret(en.totp.secret);
    })();
  }, [sb]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true); setErr(null);
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
    setBusy(false);
    if (error) { setErr("That code didn't work. Check your authenticator app and try again."); return; }
    location.assign(safeNext(next, '/'));
  };

  return (
    <form onSubmit={verify} className={s.form}>
      {qr ? (
        <>
          <p>Scan this with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Authenticator QR code" width={180} height={180} style={{ alignSelf: 'center', background: '#fff', borderRadius: 12, padding: 8 }} />
          {secret && <p className={`${s.small} ${s.muted}`}>Or type this key: <span className={s.mono}>{secret}</span></p>}
        </>
      ) : <p>Enter the 6-digit code from your authenticator app.</p>}
      <Field label="Code"><input className={s.pinInput} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required /></Field>
      <button className={`${s.btn} ${s.full}`} disabled={busy || !factorId}>{busy ? 'Checking…' : 'Verify'}</button>
      {err && <p role="alert" className={s.badBox}>{err}</p>}
    </form>
  );
}
