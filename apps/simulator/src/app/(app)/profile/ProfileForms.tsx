'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { Profile, Role } from '@/lib/types';
import s from '@/ui/ui.module.css';
import { ErrorLine } from '../../(auth)/forms';
import { changePassword, deleteAccount, updateProfile, type ProfileState } from '../actions';
import { AvatarPicker, BioField, RolePicker, UsernameField } from '../ProfileFields';
import { useFormStatus } from 'react-dom';

function Save({ label = 'Save changes', danger }: { label?: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnSm} ${danger ? s.btnDanger : ''}`} disabled={pending}>
      {pending && <span className={s.spinner} aria-hidden="true" />}{label}
    </button>
  );
}

/* "Saved" fades out a few seconds after each successful save. */
function useSavedFlash(state: ProfileState) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!state?.saved) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [state]);
  return show;
}

export default function ProfileForms({ profile, usesPassword }: { profile: Profile; usesPassword: boolean }) {
  const [name, setName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? '');
  const [role, setRole] = useState<Role | null>(profile.role);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);
  const [bio, setBio] = useState(profile.bio);
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, undefined);
  const saved = useSavedFlash(state);

  const [pw, pwAction] = useActionState<ProfileState, FormData>(changePassword, undefined);
  const pwSaved = useSavedFlash(pw);
  const pwForm = useRef<HTMLFormElement>(null);
  useEffect(() => { if (pw?.saved) pwForm.current?.reset(); }, [pw]);

  const [del, delAction] = useActionState<ProfileState, FormData>(deleteAccount, undefined);
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className={s.panels}>
      <form action={action} className={`${s.panel} ${s.form}`}>
        <div>
          <h3>About you</h3>
          <p className={s.hint} style={{ margin: 0 }}>Your name and picture show up in the simulator&apos;s top bar.</p>
        </div>
        <ErrorLine msg={state?.field === 'username' ? null : state?.error} />
        <AvatarPicker uid={profile.id} name={name} url={avatar} onChange={setAvatar} />
        <input type="hidden" name="avatar_url" value={avatar ?? ''} />
        <div className={s.two}>
          <label className={s.field}>
            <span className={s.label}>Your name</span>
            <input className={s.input} name="display_name" value={name} onChange={e => setName(e.target.value)} maxLength={50} required autoComplete="name" />
          </label>
          <UsernameField value={username} onChange={setUsername} initial={profile.username} error={state?.field === 'username' ? state.error : undefined} />
        </div>
        <div className={s.field}>
          <span className={s.label}>I&apos;m a…</span>
          <RolePicker value={role} onChange={setRole} />
          <input type="hidden" name="role" value={role ?? ''} />
        </div>
        <BioField value={bio} onChange={setBio} />
        <div className={s.saveRow}>
          <Save />
          {saved && <span className={s.saved} role="status">✓ Saved</span>}
        </div>
      </form>

      {usesPassword && (
        <form action={pwAction} ref={pwForm} className={`${s.panel} ${s.form}`}>
          <div>
            <h3>Password</h3>
            <p className={s.hint} style={{ margin: 0 }}>At least 8 characters.</p>
          </div>
          <ErrorLine msg={pw?.error} />
          <div className={s.two}>
            <label className={s.field}>
              <span className={s.label}>New password</span>
              <input className={s.input} name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className={s.field}>
              <span className={s.label}>Type it again</span>
              <input className={s.input} name="again" type="password" autoComplete="new-password" minLength={8} required />
            </label>
          </div>
          <div className={s.saveRow}>
            <Save label="Change password" />
            {pwSaved && <span className={s.saved} role="status">✓ Password changed</span>}
          </div>
        </form>
      )}

      <form action={delAction} className={`${s.panel} ${s.dangerPanel} ${s.form}`}>
        <div>
          <h3>Delete account</h3>
          <p className={s.hint} style={{ margin: 0 }}>This deletes your profile and every project, for good. It can&apos;t be undone.</p>
        </div>
        <ErrorLine msg={del?.error} />
        <label className={s.field}>
          <span className={s.label}><span>Type <b>{profile.username}</b> to confirm</span></span>
          <input className={s.input} name="confirm" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <div className={s.saveRow}>
          {confirmText.toLowerCase() === (profile.username ?? '').toLowerCase() && confirmText
            ? <Save label="Delete my account" danger />
            : <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} disabled>Delete my account</button>}
        </div>
      </form>
    </div>
  );
}
