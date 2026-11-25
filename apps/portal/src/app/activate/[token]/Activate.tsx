'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ActionForm, Field, Submit } from '@/ui/Form';
import s from '@/ui/ui.module.css';
import { acceptTerms, createAccount, finishWithoutPayment, sendCode, startCheckout, verifyCode } from '../actions';

type Step = 'verify' | 'account' | 'terms' | 'pay';
const ORDER: Step[] = ['verify', 'account', 'terms', 'pay'];

export type Pkg = { name: string; standard: boolean; terms: string[]; lines: { label: string; value: string }[]; join: string; gst: string; total: string };

export default function Activate({ token, step, email, failed, institute, pkg, termsVersion, online }: {
  token: string; step: Step; email: string; failed: boolean;
  institute: { name: string; city: string; state: string; address: string; gst: string; contactName: string };
  pkg: Pkg | null;
  termsVersion: string; online: boolean;
}) {
  const router = useRouter();
  const next = () => router.refresh();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const idx = ORDER.indexOf(step);

  return (
    <div className={s.stack}>
      <div className={s.steps} aria-label={`Step ${idx + 1} of 4`}>{ORDER.map((k, i) => <i key={k} data-on={i <= idx} />)}</div>

      {step === 'verify' && (
        <>
          <h2 className={s.h2}>1. Verify your email</h2>
          <p className={s.muted}>We&apos;ll send a 6-digit code to <b>{email}</b>.</p>
          <button className={s.btnGhost} disabled={pending} onClick={() => start(async () => setMsg(await sendCode(token)))}>
            {pending ? 'Sending…' : 'Send code'}
          </button>
          {msg?.error && <p className={s.badBox}>{msg.error}</p>}
          {msg?.ok && <p className={s.okBox}>{msg.ok}</p>}
          <ActionForm action={verifyCode.bind(null, token)} onDone={next} showOk={false}>
            <Field label="Code"><input className={s.pinInput} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></Field>
            <Submit>Verify</Submit>
          </ActionForm>
        </>
      )}

      {step === 'account' && (
        <>
          <h2 className={s.h2}>2. Create your admin account</h2>
          <p className={s.muted}>You&apos;ll sign in with <b>{email}</b>. You can invite more admins and teachers later.</p>
          <ActionForm action={createAccount.bind(null, token)} onDone={next} showOk={false}>
            <Field label="Your name"><input className={s.input} name="name" defaultValue={institute.contactName} required maxLength={80} /></Field>
            <Field label="Password" hint="At least 8 characters. Already have a StemGrid simulator account with this email? Use that password."><input className={s.input} type="password" name="password" minLength={8} autoComplete="new-password" required /></Field>
            <Field label="Password again"><input className={s.input} type="password" name="password2" minLength={8} autoComplete="new-password" required /></Field>
            <Submit pendingText="Creating…">Create account</Submit>
          </ActionForm>
        </>
      )}

      {step === 'terms' && (
        <>
          <h2 className={s.h2}>3. {pkg?.standard ? 'Plan terms' : 'Membership terms'}</h2>
          {pkg && (
            <>
              <ul className={s.list}><li><span>{pkg.standard ? 'Package' : 'Wave'}</span><b>{pkg.name}</b></li></ul>
              {!!pkg.terms.length && <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.45 }}>{pkg.terms.map((t, i) => <li key={i}>{t}</li>)}</ul>}
            </>
          )}
          <ActionForm action={acceptTerms.bind(null, token)} onDone={next} showOk={false}>
            <p className={s.small + ' ' + s.muted}>For your GST invoice:</p>
            <Field label="Address"><input className={s.input} name="address" defaultValue={institute.address} maxLength={400} /></Field>
            <div className={s.formRow}>
              <Field label="City"><input className={s.input} name="city" defaultValue={institute.city} maxLength={80} /></Field>
              <Field label="State"><input className={s.input} name="state" defaultValue={institute.state} maxLength={80} required /></Field>
              <Field label="GSTIN (optional)"><input className={s.input} name="gst" defaultValue={institute.gst} maxLength={20} /></Field>
            </div>
            <label className={s.check}><input type="checkbox" name="terms" required /> <span>I accept the <a href="/terms" target="_blank">StemGrid {pkg?.standard ? 'terms' : 'membership terms'}</a> (version {termsVersion}) on behalf of {institute.name}.</span></label>
            <label className={s.check}><input type="checkbox" name="consent" required /> <span>I declare that {institute.name} has obtained parental consent for every student under 18 for whom it creates a StemGrid account, as required by the Digital Personal Data Protection Act, 2023.</span></label>
            <Submit>Continue</Submit>
          </ActionForm>
        </>
      )}

      {step === 'pay' && pkg && (
        <>
          <h2 className={s.h2}>4. Pay to join</h2>
          {failed && <p className={s.badBox}>The payment didn&apos;t go through. You haven&apos;t been charged; please try again.</p>}
          <ul className={s.list}>
            {pkg.lines.map(l => <li key={l.label}><span>{l.label}</span><span>{l.value}</span></li>)}
            <li><span>Joining amount</span><b>{pkg.join}</b></li>
            <li><span>GST 18%</span><span>{pkg.gst}</span></li>
            <li><b>Total today</b><b>{pkg.total}</b></li>
          </ul>
          <p className={s.small + ' ' + s.muted}>{pkg.standard
            ? <>This covers onboarding and your first month on {pkg.name}. The month starts when your account goes live.</>
            : <>Your {pkg.name} place is confirmed when the payment arrives. If the wave fills while you are paying, we&apos;ll offer the next wave or a full refund.</>}</p>
          {!online ? (
            <>
              <p className={s.info}>We&apos;ll contact you with the payment details (bank transfer or UPI). Your portal opens as soon as the payment is received.</p>
              <button className={s.btn} disabled={pending} onClick={() => start(async () => {
                const r = await finishWithoutPayment(token);
                if (r?.error) setMsg(r); else router.refresh();
              })}>{pending ? 'Finishing…' : 'Finish activation'}</button>
            </>
          ) : <button className={s.btn} disabled={pending} onClick={() => start(async () => {
            const r = await startCheckout(token);
            if (r?.error) { setMsg(r); return; }
            const url = (r?.data as { url?: string } | undefined)?.url;
            if (url) location.assign(url);
          })}>{pending ? 'Opening payment…' : `Pay ${pkg.total}`}</button>}
          {msg?.error && <p className={s.badBox}>{msg.error}</p>}
        </>
      )}
    </div>
  );
}
