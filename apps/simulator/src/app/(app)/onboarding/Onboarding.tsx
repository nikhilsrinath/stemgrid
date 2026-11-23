'use client';

import { useActionState, useEffect, useState } from 'react';
import type { Profile, Role } from '@/lib/types';
import s from '@/ui/ui.module.css';
import { Submit, ErrorLine } from '../../(auth)/forms';
import { completeOnboarding, type ProfileState } from '../actions';
import { AvatarPicker, BioField, RolePicker, UsernameField } from '../ProfileFields';

const suggest = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 16);

/* Three short steps: name + @username, role, picture + bio. Everything is sent once, at the end. */
export default function Onboarding({ profile, next }: { profile: Profile; next: string }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? (suggest(profile.display_name).length >= 3 ? suggest(profile.display_name) : ''));
  const [role, setRole] = useState<Role | null>(profile.role);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);
  const [bio, setBio] = useState(profile.bio);
  const [state, action] = useActionState<ProfileState, FormData>(completeOnboarding, undefined);
  const [local, setLocal] = useState('');

  const shown = state;
  // a username error from the server sends you back to step 1
  useEffect(() => { if (state?.field === 'username') setStep(0); }, [state]);

  const go = (n: number) => {
    setLocal('');
    if (n > step && step === 0) {
      if (!name.trim()) return setLocal('Tell us what to call you.');
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return setLocal('Pick a username: 3 to 20 characters, lowercase letters, numbers and _.');
    }
    if (n > step && step === 1 && !role) return setLocal('Pick the one that fits you best.');
    setStep(n);
  };

  const heads = [
    ['Set up your profile', 'This is how you show up on StemGrid.'],
    ['Which of these are you?', 'Pick the one that fits you best. You can change it later.'],
    ['Add a face', 'A picture and a line about you. You can skip this.'],
  ];

  return (
    <form action={action} className={s.form} onSubmit={e => { if (step < 2) { e.preventDefault(); go(step + 1); } }}>
      <div className={s.steps} aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map(i => <i key={i} data-on={i <= step} />)}</div>
      <h1 className={s.h1}>{heads[step][0]}</h1>
      <p className={s.sub} style={{ marginBottom: 6 }}>{heads[step][1]}</p>
      <ErrorLine msg={local || shown?.error} />

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="display_name" value={name} />
      <input type="hidden" name="role" value={role ?? ''} />
      <input type="hidden" name="avatar_url" value={avatar ?? ''} />
      {step !== 0 && <input type="hidden" name="username" value={username} />}
      {step !== 2 && <input type="hidden" name="bio" value={bio} />}

      {step === 0 && (
        <>
          <label className={s.field}>
            <span className={s.label}>Your name</span>
            <input className={s.input} value={name} onChange={e => setName(e.target.value)} maxLength={50} autoComplete="name" autoFocus />
          </label>
          <UsernameField value={username} onChange={setUsername} initial={profile.username} error={shown?.field === 'username' ? shown.error : undefined} />
        </>
      )}
      {step === 1 && <RolePicker value={role} onChange={r => { setRole(r); setLocal(''); }} />}
      {step === 2 && (
        <>
          <AvatarPicker uid={profile.id} name={name} url={avatar} onChange={setAvatar} />
          <BioField value={bio} onChange={setBio} />
        </>
      )}

      <div className={s.actions}>
        {step > 0 ? <button type="button" className={s.linkBtn} onClick={() => go(step - 1)}>← Back</button> : <span />}
        <div style={{ minWidth: 170 }}>
          {step < 2
            ? <button type="submit" className={`${s.btn} ${s.btnBlock}`}>Next →</button>
            : <Submit>Start building →</Submit>}
        </div>
      </div>
    </form>
  );
}
