'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  forgotPassword, resetPassword, signIn, signInWithGoogle, signUp, submitEnquiry,
  type EnquiryState, type FormState,
} from './actions';
import AuthSplit, { type AuthAside } from '@/ui/AuthSplit';
import s from '@/ui/ui.module.css';
import a from '@/ui/auth.module.css';

/* ---------------------------------------------------------------- shared with onboarding / profile (cream card look) */
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

/* ---------------------------------------------------------------- dark auth pieces */
function Go({ children, pending }: { children: ReactNode; pending?: boolean }) {
  const st = useFormStatus();
  const busy = pending ?? st.pending;
  return (
    <button type="submit" className={`${a.btn} ${a.block}`} disabled={busy}>
      {busy && <span className={a.spinner} aria-hidden="true" />}{children}
    </button>
  );
}

function Oops({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <div className={a.error} role="alert"><span aria-hidden="true">!</span><span>{msg}</span></div>;
}

const Eye = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="m3 3 18 18" />}
  </svg>
);

function Password({ name = 'password', label = 'Password', autoComplete, hint, extra, placeholder = 'Enter your password' }: { name?: string; label?: string; autoComplete: string; hint?: string; extra?: ReactNode; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className={a.field}>
      <label className={a.label} htmlFor={name}>{label}{extra}</label>
      <div className={a.pw}>
        <input id={name} className={a.input} name={name} type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} />
        <button type="button" className={a.eye} onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'}><Eye off={show} /></button>
      </div>
      {hint && <span className={a.hint}>{hint}</span>}
    </div>
  );
}

function Field({ label, opt, children, hint }: { label: string; opt?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className={a.field}>
      <span className={a.label}><span>{label}{opt && <em> (optional)</em>}</span></span>
      {children}
      {hint && <span className={a.hint}>{hint}</span>}
    </label>
  );
}

function Select({ name, options, required = true, placeholder = 'Select…', onChange }: { name: string; options: string[]; required?: boolean; placeholder?: string; onChange?: (v: string) => void }) {
  return (
    <select className={a.select} name={name} required={required} defaultValue="" onChange={e => onChange?.(e.target.value)}>
      <option value="" disabled={required}>{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

function Chips({ legend, name, options, type = 'checkbox', opt, required }: { legend: string; name: string; options: string[]; type?: 'checkbox' | 'radio'; opt?: boolean; required?: boolean }) {
  return (
    <fieldset className={a.chips} data-required={required || undefined} data-name={name}>
      <legend>{legend}{opt && <em> (optional)</em>}</legend>
      {options.map(o => (
        <label key={o} className={a.chip}>
          <input type={type} name={name} value={o} />
          <span>{o}</span>
        </label>
      ))}
    </fieldset>
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
      <div className={a.divider}>or</div>
    </>
  );
}
function GoogleSubmit({ verb }: { verb: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${a.btn} ${a.btnGhost} ${a.block}`} disabled={pending}>
      {pending ? <span className={a.spinner} aria-hidden="true" /> : <GoogleLogo />}{verb} with Google
    </button>
  );
}

const withNext = (path: string, next: string) => (next && next !== '/projects' ? `${path}?next=${encodeURIComponent(next)}` : path);

/* ---------------------------------------------------------------- sign in */
export function LoginForm({ next, error, google }: { next: string; error?: string; google: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  return (
    <>
      <h1 className={a.h1}>Sign in to StemGrid</h1>
      <div className={a.form}>
        <Oops msg={state?.error ?? error} />
        <GoogleButton next={next} enabled={google} verb="Continue" />
        <form action={action} className={a.form}>
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input className={a.input} name="email" type="email" placeholder="you@example.com" autoComplete="email" required autoFocus />
          </Field>
          <Password autoComplete="current-password" extra={<Link href="/forgot-password">Forgot password?</Link>} />
          <Go>Sign in</Go>
        </form>
      </div>
      <p className={a.foot}>New to StemGrid? <Link href={withNext('/signup', next)}>Create an account</Link></p>
      <p className={a.fine}>For institutions: <Link href="/signup?as=institution">Partner with us</Link></p>
    </>
  );
}

/* ---------------------------------------------------------------- sign up: Individual or Institution */
export type Audience = 'individual' | 'institution';

const PERSON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>;
const BUILDING = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>;

const ASIDES: Record<Audience, Omit<AuthAside, 'active'>> = {
  individual: {
    title: 'Start building with StemGrid',
    steps: ['Create your account', 'Pick your username', 'Build your first circuit'],
  },
  institution: {
    title: 'Bring StemGrid to your campus',
    steps: ['Your institution', 'Point of contact', 'What you need'],
  },
};

export function SignupFlow({ next, google, initial }: { next: string; google: boolean; initial: Audience }) {
  const [who, setWho] = useState<Audience>(initial);
  const [step, setStep] = useState(0);
  const pick = (w: Audience) => {
    setWho(w);
    const u = new URL(location.href);
    if (w === 'institution') u.searchParams.set('as', 'institution'); else u.searchParams.delete('as');
    history.replaceState(null, '', u);
  };
  return (
    <AuthSplit aside={{ ...ASIDES[who], active: who === 'institution' ? step : 0 }} wide={who === 'institution'}>
      {step < 3 && (
        <>
          <h1 className={a.h1}>{who === 'individual' ? 'Create your account' : 'Partner with StemGrid'}</h1>
          <div className={a.who} role="radiogroup" aria-label="Who is this account for?">
            <button type="button" role="radio" aria-checked={who === 'individual'} className={a.whoBtn} onClick={() => pick('individual')}>
              {PERSON}Individual
            </button>
            <button type="button" role="radio" aria-checked={who === 'institution'} className={a.whoBtn} onClick={() => pick('institution')}>
              {BUILDING}Institution
            </button>
          </div>
        </>
      )}
      {who === 'individual' ? <IndividualForm next={next} google={google} /> : <InstitutionForm step={step} setStep={setStep} />}
    </AuthSplit>
  );
}

function IndividualForm({ next, google }: { next: string; google: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  if (state?.done) {
    return (
      <div className={a.done}>
        <div className={a.tick}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></div>
        <h2 className={a.h1}>Check your inbox</h2>
        <p className={a.sub}>We sent a link to <b>{state.email}</b>. Open it on this device to confirm your email, and you&apos;re in.</p>
        <div className={a.notice}>Nothing there? It can take a minute. Check your spam folder too.</div>
        <p className={a.foot}>Wrong email? <a href={withNext('/signup', next)}>Start again</a></p>
      </div>
    );
  }
  return (
    <>
      <div className={a.form}>
        <Oops msg={state?.error} />
        <GoogleButton next={next} enabled={google} verb="Sign up" />
        <form action={action} className={a.form}>
          <input type="hidden" name="next" value={next} />
          <Field label="Full name">
            <input className={a.input} name="name" autoComplete="name" required maxLength={50} />
          </Field>
          <Field label="Email">
            <input className={a.input} name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </Field>
          <Password autoComplete="new-password" placeholder="At least 8 characters" />
          <Go>Create account</Go>
        </form>
      </div>
      <p className={a.foot}>Already have an account? <Link href={withNext('/login', next)}>Sign in</Link></p>
    </>
  );
}

/* ---------------------------------------------------------------- institution enquiry (3 steps, one form) */
const ORG_TYPES = ['School', 'Coaching centre / academy', 'College / university', 'Tinkering or STEM lab', 'Company (CSR / L&D)', 'NGO / foundation', 'Government body', 'Distributor / reseller', 'Other'];
const CURRICULA = ['CBSE', 'ICSE / ISC', 'State board', 'IB', 'Cambridge (IGCSE)', 'Other'];
const LEARNERS = ['Under 200', '200 – 500', '500 – 1,000', '1,000 – 3,000', '3,000+'];
const LEVELS = ['Primary (1–5)', 'Middle (6–8)', 'Secondary (9–10)', 'Senior secondary (11–12)', 'Undergraduate', 'Postgraduate', 'Adults / professionals'];
const ROLES = ['Principal / Director', 'Founder / Owner', 'Trustee / Management', 'Head of department', 'STEM / Lab coordinator', 'Teacher / Faculty', 'Purchase / Administration', 'Other'];
const INTERESTS = ['Quark kits for classrooms', 'Simulator access for learners', 'Complete STEM / robotics lab', 'Teacher training', 'Curriculum & lesson plans', 'Workshops & competitions', 'Founding membership', 'Reselling StemGrid'];
const SETUPS = ['No lab yet', 'We have a lab and want to upgrade', 'We use kits from another brand', 'We run STEM classes without kits'];
const TIMELINES = ['Within a month', 'This term', 'Next academic year', 'Just exploring'];
const DECISIONS = ['I make the decision', 'I recommend to management', 'I am gathering information'];
const BUDGETS = ['Approved', 'Being planned', 'Not yet discussed'];
const HEARD = ['Google search', 'Social media', 'A school or colleague', 'Event or exhibition', 'StemGrid team reached out', 'Other'];

const STEPS = [
  { head: 'Your institution' },
  { head: 'Point of contact' },
  { head: 'What you need' },
];

function InstitutionForm({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, undefined);
  const [orgType, setOrgType] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const done = !!state?.done;
  useEffect(() => { if (done) setStep(3); }, [done, setStep]);

  /* Checks the visible step only (the form is noValidate, so hidden steps don't block). */
  const valid = (i: number) => {
    const box = formRef.current?.querySelector<HTMLElement>(`[data-step="${i}"]`);
    if (!box) return true;
    for (const el of box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) {
      if (el.type === 'checkbox' || el.type === 'radio') continue;
      if (!el.checkValidity()) { el.reportValidity(); return false; }
    }
    for (const fs of box.querySelectorAll<HTMLFieldSetElement>('fieldset[data-required]')) {
      if (!fs.querySelector('input:checked')) {
        setHint(`Pick at least one: ${fs.querySelector('legend')?.firstChild?.textContent ?? 'option'}.`);
        fs.querySelector('input')?.focus();
        return false;
      }
    }
    const consent = box.querySelector<HTMLInputElement>('input[name="consent"]');
    if (consent && !consent.checked) { consent.setCustomValidity('Tick this so we can contact you.'); consent.reportValidity(); consent.setCustomValidity(''); return false; }
    setHint(null);
    return true;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid(step)) return;
    if (step < 2) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  if (done) {
    return (
      <div className={a.done}>
        <div className={a.tick}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
        <h1 className={a.h1}>Thank you{state?.name ? `, ${state.name}` : ''}</h1>
        <div className={a.refBox}><small>Your reference</small><b>{state?.ref}</b></div>
        <Link href="/simulator" className={`${a.btn} ${a.block}`}>Try the simulator</Link>
        <p className={a.fine}>Call us: <a href="tel:+918925172636">+91 89251 72636</a></p>
      </div>
    );
  }

  return (
    <>
      <div className={a.progress}>
        {STEPS.map((t, i) => (
          <div key={t.head} className={a.pStep} data-on={i === step} data-done={i < step}><i /><span>{i + 1}. {t.head}</span></div>
        ))}
      </div>
      <form ref={formRef} className={a.form} onSubmit={onSubmit} noValidate>
        <Oops msg={hint ?? state?.error} />
        <div className={a.hp} aria-hidden="true"><label>Company fax<input name="company_fax" tabIndex={-1} autoComplete="off" /></label></div>

        {/* 1. the institution */}
        <div className={a.step} data-step="0" hidden={step !== 0}>
          <Field label="Institution name">
            <input className={a.input} name="org_name" required minLength={2} maxLength={120} autoComplete="organization" />
          </Field>
          <div className={a.row}>
            <Field label="Type of institution"><Select name="org_type" options={ORG_TYPES} onChange={setOrgType} /></Field>
            <Field label="Number of learners"><Select name="learners" options={LEARNERS} /></Field>
          </div>
          {orgType === 'School' && <Field label="Board / curriculum" opt><Select name="curriculum" options={CURRICULA} required={false} placeholder="Select…" /></Field>}
          <div className={a.row}>
            <Field label="City"><input className={a.input} name="city" required maxLength={80} autoComplete="address-level2" /></Field>
            <Field label="State / region"><input className={a.input} name="region" required maxLength={80} autoComplete="address-level1" /></Field>
          </div>
          <div className={a.row}>
            <Field label="Country"><input className={a.input} name="country" defaultValue="India" required maxLength={60} autoComplete="country-name" /></Field>
            <Field label="Website" opt><input className={a.input} name="website" placeholder="yourschool.edu.in" maxLength={200} autoComplete="url" /></Field>
          </div>
          <Chips legend="Age groups you teach" name="levels" options={LEVELS} opt />
        </div>

        {/* 2. the contact */}
        <div className={a.step} data-step="1" hidden={step !== 1}>
          <div className={a.row}>
            <Field label="Full name"><input className={a.input} name="contact_name" required minLength={2} maxLength={80} autoComplete="name" /></Field>
            <Field label="Your role"><Select name="designation" options={ROLES} /></Field>
          </div>
          <Field label="Work email">
            <input className={a.input} name="email" type="email" placeholder="name@yourschool.edu.in" required maxLength={160} autoComplete="email" />
          </Field>
          <Field label="Phone number">
            <input className={a.input} name="phone" type="tel" placeholder="+91 98765 43210" required pattern="\+?[0-9 ()\-]{7,20}" maxLength={20} autoComplete="tel" />
          </Field>
          <div className={a.row}>
            <Field label="Best way to reach you" opt><Select name="channel" options={['Phone call', 'WhatsApp', 'Email']} required={false} placeholder="Any" /></Field>
            <Field label="Best time" opt><Select name="best_time" options={['Morning (9–12)', 'Afternoon (12–4)', 'Evening (4–7)']} required={false} placeholder="Any time" /></Field>
          </div>
        </div>

        {/* 3. what they need */}
        <div className={a.step} data-step="2" hidden={step !== 2}>
          <Chips legend="Interested in" name="interests" options={INTERESTS} required />
          <div className={a.row}>
            <Field label="When do you want to start?"><Select name="timeline" options={TIMELINES} /></Field>
            <Field label="Your current setup" opt><Select name="current_setup" options={SETUPS} required={false} /></Field>
          </div>
          <div className={a.row}>
            <Field label="Your part in the decision" opt><Select name="decision_role" options={DECISIONS} required={false} /></Field>
            <Field label="Budget status" opt><Select name="budget" options={BUDGETS} required={false} /></Field>
          </div>
          <Field label="How did you hear about us?" opt><Select name="heard_from" options={HEARD} required={false} /></Field>
          <Field label="Anything else we should know?" opt>
            <textarea className={a.textarea} name="message" maxLength={2000} placeholder="Number of classrooms, lab space, dates that matter, questions…" />
          </Field>
          <label className={a.check}>
            <input type="checkbox" name="consent" required />
            <span>I agree that StemGrid may contact me by phone, WhatsApp or email about this enquiry.</span>
          </label>
        </div>

        <div className={a.nav}>
          {step > 0 && <button type="button" className={`${a.btn} ${a.btnGhost}`} onClick={() => { setHint(null); setStep(step - 1); }}>Back</button>}
          <Go pending={pending}>{step < 2 ? 'Continue' : 'Send enquiry'}</Go>
        </div>
      </form>
      <p className={a.foot}>Already partnered with us? <Link href="/login">Sign in</Link></p>
    </>
  );
}

/* ---------------------------------------------------------------- forgot / reset */
export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, undefined);
  if (state?.done) {
    return (
      <>
        <h1 className={a.h1}>Check your inbox</h1>
        <p className={a.sub}>If there&apos;s an account for <b>{state.email}</b>, we&apos;ve sent it a link to pick a new password.</p>
        <Link href="/login" className={`${a.btn} ${a.btnGhost} ${a.block}`}>Back to sign in</Link>
      </>
    );
  }
  return (
    <>
      <h1 className={a.h1}>Forgot your password?</h1>
      <form action={action} className={a.form}>
        <Oops msg={state?.error} />
        <Field label="Email">
          <input className={a.input} name="email" type="email" placeholder="you@example.com" autoComplete="email" required autoFocus />
        </Field>
        <Go>Send the link</Go>
      </form>
      <p className={a.foot}>Remembered it? <Link href="/login">Sign in</Link></p>
    </>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <>
      <h1 className={a.h1}>Pick a new password</h1>
      <form action={action} className={a.form}>
        <Oops msg={state?.error} />
        <Password autoComplete="new-password" label="New password" placeholder="New password" />
        <Password name="again" autoComplete="new-password" label="Type it again" placeholder="Repeat it" />
        <Go>Save new password</Go>
      </form>
    </>
  );
}
