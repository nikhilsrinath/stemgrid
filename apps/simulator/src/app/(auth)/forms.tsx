'use client';

import Link from 'next/link';
import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { forgotPassword, resetPassword, signIn, signInWithGoogle, signUp, type FormState } from './actions';
import s from '@/ui/ui.module.css';

export function Submit({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnBlock} ${className}`} disabled={pending} data-hero-cta>
      {pending && <span className={s.spinner} aria-hidden="true" />}{children}
    </button>
  );
}

export function ErrorLine({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <div className={s.error} role="alert"><span aria-hidden="true">⚠</span><span>{msg}</span></div>;
}

function Password({ name = 'password', label = 'Password', autoComplete, hint, extra }: { name?: string; label?: string; autoComplete: string; hint?: string; extra?: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <label className={s.field}>
      <span className={s.label}>{label}{extra}</span>
      <span className={s.prefix}>
        <input className={s.input} name={name} type={show ? 'text' : 'password'} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} style={{ paddingRight: 64 }} />
        <i>
          <button type="button" className={s.linkBtn} onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'} style={{ fontSize: 13 }}>
            {show ? 'Hide' : 'Show'}
          </button>
        </i>
      </span>
      {hint && <span className={s.hint}>{hint}</span>}
    </label>
  );
}

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
);

function GoogleButton({ next, enabled, verb }: { next: string; enabled: boolean; verb: string }) {
  if (!enabled) return null;
  return (
    <>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleSubmit verb={verb} />
      </form>
      <div className={s.divider}>or use your email</div>
    </>
  );
}
function GoogleSubmit({ verb }: { verb: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnLight} ${s.btnBlock}`} disabled={pending}>
      {pending ? <span className={s.spinner} aria-hidden="true" /> : <GoogleLogo />}{verb} with Google
    </button>
  );
}

const withNext = (path: string, next: string) => (next && next !== '/projects' ? `${path}?next=${encodeURIComponent(next)}` : path);

export function LoginForm({ next, error, google }: { next: string; error?: string; google: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <>
      <h1 className={s.h1}>Welcome back</h1>
      <p className={s.sub}>{next.startsWith('/simulator') ? 'Sign in and your build is saved to your projects.' : 'Sign in to open your builds.'}</p>
      <div className={s.form}>
        <ErrorLine msg={state?.error ?? error} />
        <GoogleButton next={next} enabled={google} verb="Sign in" />
        <form action={action} className={s.form}>
          <input type="hidden" name="next" value={next} />
          <label className={s.field}>
            <span className={s.label}>Email</span>
            <input className={s.input} name="email" type="email" autoComplete="email" required autoFocus />
          </label>
          <Password autoComplete="current-password" extra={<Link href="/forgot-password" className={s.hint}>Forgot it?</Link>} />
          <Submit>Sign in</Submit>
        </form>
      </div>
      <p className={s.foot}>New to StemGrid? <Link href={withNext('/signup', next)}>Create an account</Link></p>
    </>
  );
}

export function SignupForm({ next, google }: { next: string; google: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  if (state?.done) {
    return (
      <>
        <h1 className={s.h1}>Check your inbox</h1>
        <p className={s.sub}>We sent a link to <b>{state.email}</b>. Open it on this device to confirm your email, and you&apos;re in.</p>
        <div className={s.notice}><span aria-hidden="true">✉</span><span>Nothing there? It can take a minute. Check your spam folder too.</span></div>
        <p className={s.foot}>Wrong email? <a href={withNext('/signup', next)}>Start again</a></p>
      </>
    );
  }
  return (
    <>
      <h1 className={s.h1}>Make an account</h1>
      <p className={s.sub}>Save your builds and pick them up on any computer. It&apos;s free.</p>
      <div className={s.form}>
        <ErrorLine msg={state?.error} />
        <GoogleButton next={next} enabled={google} verb="Sign up" />
        <form action={action} className={s.form}>
          <input type="hidden" name="next" value={next} />
          <label className={s.field}>
            <span className={s.label}>Your name</span>
            <input className={s.input} name="name" autoComplete="name" required maxLength={50} autoFocus />
          </label>
          <label className={s.field}>
            <span className={s.label}>Email</span>
            <input className={s.input} name="email" type="email" autoComplete="email" required />
          </label>
          <Password autoComplete="new-password" hint="At least 8 characters." />
          <Submit>Create account</Submit>
        </form>
      </div>
      <p className={s.foot}>Already have an account? <Link href={withNext('/login', next)}>Sign in</Link></p>
    </>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, undefined);
  if (state?.done) {
    return (
      <>
        <h1 className={s.h1}>Check your inbox</h1>
        <p className={s.sub}>If there&apos;s an account for <b>{state.email}</b>, we&apos;ve sent it a link to pick a new password.</p>
        <p className={s.foot}><Link href="/login">Back to sign in</Link></p>
      </>
    );
  }
  return (
    <>
      <h1 className={s.h1}>Forgot your password?</h1>
      <p className={s.sub}>No problem. Enter your email and we&apos;ll send you a link to pick a new one.</p>
      <form action={action} className={s.form}>
        <ErrorLine msg={state?.error} />
        <label className={s.field}>
          <span className={s.label}>Email</span>
          <input className={s.input} name="email" type="email" autoComplete="email" required autoFocus />
        </label>
        <Submit>Send the link</Submit>
      </form>
      <p className={s.foot}>Remembered it? <Link href="/login">Sign in</Link></p>
    </>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <>
      <h1 className={s.h1}>Pick a new password</h1>
      <p className={s.sub}>Make it at least 8 characters.</p>
      <form action={action} className={s.form}>
        <ErrorLine msg={state?.error} />
        <Password autoComplete="new-password" label="New password" />
        <Password name="again" autoComplete="new-password" label="Type it again" />
        <Submit>Save new password</Submit>
      </form>
    </>
  );
}
