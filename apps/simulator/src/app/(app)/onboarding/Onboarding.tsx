'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { HOME_HREF } from '@/lib/hosts';
import { initials, type Profile, type Role } from '@/lib/types';
import BrandLogo from '@/ui/BrandLogo';
import { uploadAvatar } from '@/ui/avatar-upload';
import { signOut } from '../../(auth)/actions';
import { completeOnboarding, type ProfileState } from '../actions';
import { ROLE_INFO, useUsernameAvail } from '../ProfileFields';
import o from './onboarding.module.css';

const suggest = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 16);

const STEPS = [
  { tab: 'Your details', title: 'Let’s start with your details', sub: 'This is how other builders see you on StemGrid.' },
  { tab: 'Your role', title: 'Which of these are you?', sub: 'Pick the one that fits best. You can change it later.' },
  { tab: 'Your picture', title: 'Add a picture', sub: 'A face and a line about what you like to build.' },
];

const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Chevron = () => <svg className={o.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;
const Check = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10" /></svg>;

/* The onboarding page: a centred card on a soft red glow with a step pill above it.
   Three short steps (details, role, picture + bio); everything is sent once, at the end. */
export function OnboardingShell({ children }: { children: ReactNode }) {
  return (
    <div className={o.page}>
      <div className={o.glow} aria-hidden="true" />
      <header className={o.top}>
        <Link href={HOME_HREF} className={o.logo}><BrandLogo height={34} /></Link>
        <form action={signOut}><button className={o.out}>Sign out</button></form>
      </header>
      <main className={o.center}>{children}</main>
    </div>
  );
}

export default function Onboarding({ profile, next }: { profile: Profile; next: string }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? (suggest(profile.display_name).length >= 3 ? suggest(profile.display_name) : ''));
  const [role, setRole] = useState<Role | null>(profile.role);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);
  const [bio, setBio] = useState(profile.bio);
  const [state, action] = useActionState<ProfileState, FormData>(completeOnboarding, undefined);
  const [local, setLocal] = useState('');
  const avail = useUsernameAvail(username, profile.username);

  // a username error from the server sends you back to step 1
  useEffect(() => { if (state?.field === 'username') setStep(0); }, [state]);

  const go = (n: number) => {
    setLocal('');
    if (n > step && step === 0) {
      if (!name.trim()) return setLocal('Tell us what to call you.');
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return setLocal('Pick a username: 3 to 20 characters, lowercase letters, numbers and _.');
      if (avail === 'taken') return setLocal('Someone already has that username. Try another.');
    }
    if (n > step && step === 1 && !role) return setLocal('Pick the one that fits you best.');
    setStep(n);
  };

  const err = local || state?.error;
  const cur = STEPS[step];

  return (
    <OnboardingShell>
      <ol className={o.steps} aria-label={`Step ${step + 1} of 3`}>
        {STEPS.map((x, i) => (
          <li key={x.tab} data-on={i === step} data-done={i < step} aria-current={i === step ? 'step' : undefined}>
            {i > 0 && <Chevron />}
            <span className={o.num}>{i < step ? <Check /> : i + 1}</span><span className={o.lbl}>{x.tab}</span>
          </li>
        ))}
      </ol>

      <form action={action} className={o.card} onSubmit={e => { if (step < 2) { e.preventDefault(); go(step + 1); } }} noValidate>
        <div className={o.head}>
          <h1 className={o.h1}>{cur.title}</h1>
          <p className={o.sub}>{cur.sub}</p>
        </div>

        <div key={step} className={o.body}>
          {err && <div className={o.error} role="alert">{err}</div>}

          {step === 0 && (
            <>
              <label className={o.field}>
                <span className={o.label}><span>Full name<sup aria-hidden="true">*</sup></span></span>
                <input className={o.input} value={name} onChange={e => setName(e.target.value)} maxLength={50} autoComplete="name" placeholder="Asha Raman" autoFocus />
              </label>
              <label className={o.field}>
                <span className={o.label}><span>Username<sup aria-hidden="true">*</sup></span></span>
                <span className={o.joined}>
                  <b aria-hidden="true">@</b>
                  <input
                    value={username} maxLength={20} autoComplete="username" spellCheck={false} placeholder="asha_builds"
                    aria-invalid={avail === 'taken' || avail === 'bad'}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  />
                  <span className={o.status} aria-live="polite">
                    {avail === 'checking' && <span className={o.checking}>Checking…</span>}
                    {avail === 'ok' && <span className={o.ok}>Available</span>}
                    {avail === 'taken' && <span className={o.bad}>Taken</span>}
                  </span>
                </span>
                <span className={`${o.hint} ${avail === 'bad' ? o.bad : ''}`}>3 to 20 characters: lowercase letters, numbers and _</span>
              </label>
            </>
          )}

          {step === 1 && (
            <div className={o.roles} role="radiogroup" aria-label="Which of these are you?">
              {ROLE_INFO.map(r => (
                <button key={r.id} type="button" role="radio" aria-checked={role === r.id} className={o.roleOpt} onClick={() => { setRole(r.id); setLocal(''); }}>
                  {r.icon}
                  <span><b>{r.name}</b><small>{r.blurb}</small></span>
                  <i className={o.radio} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <PicturePicker uid={profile.id} name={name} url={avatar} onChange={setAvatar} />
              <label className={o.field}>
                <span className={o.label}><span>Bio <em>(optional)</em></span><em>{bio.length}/280</em></span>
                <textarea className={o.textarea} maxLength={280} value={bio} onChange={e => setBio(e.target.value)} placeholder="What do you like to build?" />
              </label>
            </>
          )}
        </div>

        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="display_name" value={name} />
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="role" value={role ?? ''} />
        <input type="hidden" name="avatar_url" value={avatar ?? ''} />
        <input type="hidden" name="bio" value={bio} />

        <div className={o.foot}>
          {step > 0 ? <button type="button" className={`${o.btn} ${o.ghost}`} onClick={() => go(step - 1)}>Go back</button> : <span />}
          {step < 2 ? <button type="submit" className={o.btn}>Next step<Arrow /></button> : <Finish />}
        </div>
      </form>
    </OnboardingShell>
  );
}

function Finish() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={o.btn} disabled={pending}>
      {pending ? <span className={o.spinner} aria-hidden="true" /> : null}Start building{!pending && <Arrow />}
    </button>
  );
}

function PicturePicker({ uid, name, url, onChange }: { uid: string; name: string; url: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr('');
    try { onChange(await uploadAvatar(uid, f)); } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed. Try another picture.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className={o.field}>
      <span className={o.label}><span>Profile picture <em>(optional)</em></span></span>
      <div className={o.picRow}>
        <span className={o.face} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : initials(name || '?')}
        </span>
        <div className={o.picBtns}>
          <button type="button" className={`${o.btn} ${o.ghost}`} onClick={() => input.current?.click()} disabled={busy}>
            {busy && <span className={o.spinner} aria-hidden="true" />}{url ? 'Change picture' : 'Upload a picture'}
          </button>
          {url && !busy && <button type="button" className={o.link} onClick={() => onChange(null)}>Remove</button>}
          <span className={o.hint} style={{ flexBasis: '100%' }}>PNG, JPG or WebP</span>
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
      </div>
      {err && <span className={`${o.hint} ${o.bad}`}>{err}</span>}
    </div>
  );
}
