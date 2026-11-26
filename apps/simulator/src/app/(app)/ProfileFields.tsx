'use client';

/* Profile inputs shared by onboarding and the profile page. */
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Role } from '@/lib/types';
import Avatar from '@/ui/Avatar';
import { uploadAvatar } from '@/ui/avatar-upload';
import s from '@/ui/ui.module.css';

export const ROLE_INFO: { id: Role; name: string; blurb: string; icon: React.ReactNode }[] = [
  {
    id: 'student', name: 'Student', blurb: 'Learning to build and code circuits.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M4 18 24 8l20 10-20 10z" fill="#FF8044" /><path d="M12 22v10c0 3 6 6 12 6s12-3 12-6V22" /><path d="M44 18v12" /></svg>,
  },
  {
    id: 'teacher', name: 'Teacher', blurb: 'Running STEM lessons and labs.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><rect x="5" y="7" width="38" height="26" rx="3" fill="#FFF2DF" /><path d="M13 16h14M13 23h20" /><path d="M18 41l6-8 6 8" /></svg>,
  },
  {
    id: 'maker', name: 'Maker', blurb: 'Tinkering on projects for fun.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><rect x="8" y="14" width="32" height="22" rx="4" fill="#FF8044" /><path d="M16 14V8M24 14V8M32 14V8M16 42v-6M24 42v-6M32 42v-6" /><circle cx="24" cy="25" r="4" fill="#fff" /></svg>,
  },
];

export function RolePicker({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  return (
    <div className={s.roles} role="radiogroup" aria-label="Which of these are you?">
      {ROLE_INFO.map(r => (
        <button key={r.id} type="button" role="radio" aria-checked={value === r.id} className={s.role} onClick={() => onChange(r.id)}>
          {r.icon}<span><b>{r.name}</b><br /><small>{r.blurb}</small></span>
        </button>
      ))}
    </div>
  );
}

export type Avail = 'idle' | 'checking' | 'ok' | 'taken' | 'bad';
/* Live, debounced availability check for a username. Your current one counts as free. */
export function useUsernameAvail(value: string, initial?: string | null): Avail {
  const [avail, setAvail] = useState<Avail>('idle');
  const seq = useRef(0);
  useEffect(() => {
    const v = value;
    if (!v || v === initial) { setAvail('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(v)) { setAvail('bad'); return; }
    setAvail('checking');
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const { data, error } = await supabaseBrowser().rpc('username_available', { u: v });
      if (n !== seq.current) return;
      setAvail(error ? 'idle' : data ? 'ok' : 'taken');
    }, 350);
    return () => clearTimeout(t);
  }, [value, initial]);
  return avail;
}

export function UsernameField({ value, onChange, initial, error }: { value: string; onChange: (v: string) => void; initial?: string | null; error?: string }) {
  const avail = useUsernameAvail(value, initial);
  const msg = error ?? (avail === 'taken' ? 'Someone already has that one.' : avail === 'bad' ? '3 to 20 characters: lowercase letters, numbers and _.' : '');
  return (
    <label className={s.field}>
      <span className={s.label}>Username</span>
      <span className={s.prefix}>
        <span>@</span>
        <input
          className={s.input} name="username" value={value} required maxLength={20} autoComplete="username" spellCheck={false}
          aria-invalid={!!msg} onChange={e => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        />
        <i aria-live="polite">
          {avail === 'checking' && <span className={s.hint}>checking…</span>}
          {avail === 'ok' && <span className={s.okText}>✓ free</span>}
          {avail === 'taken' && <span className={s.badText}>✗ taken</span>}
        </i>
      </span>
      {msg ? <span className={`${s.hint} ${s.badText}`}>{msg}</span> : <span className={s.hint}>Lowercase letters, numbers and _</span>}
    </label>
  );
}

export function AvatarPicker({ uid, name, url, onChange }: { uid: string; name: string; url: string | null; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr('');
    try { onChange(await uploadAvatar(uid, f)); } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className={s.field}>
      <span className={s.label}>Profile picture <span className={s.hint}>optional</span></span>
      <div className={s.avatarRow}>
        <Avatar name={name || '?'} url={url} size={64} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className={`${s.btn} ${s.btnLight} ${s.btnSm}`} onClick={() => input.current?.click()} disabled={busy}>
            {busy && <span className={s.spinner} aria-hidden="true" />}{url ? 'Change picture' : 'Upload a picture'}
          </button>
          {url && !busy && <button type="button" className={s.linkBtn} onClick={() => onChange(null)}>Remove</button>}
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pick(e.target.files?.[0])} />
        </div>
      </div>
      {err && <span className={`${s.hint} ${s.badText}`}>{err}</span>}
    </div>
  );
}

export function BioField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className={s.field}>
      <span className={s.label}>Bio <span className={s.hint}>{value.length}/280</span></span>
      <textarea className={s.textarea} name="bio" maxLength={280} value={value} onChange={e => onChange(e.target.value)} placeholder="What do you like to build?" />
    </label>
  );
}
