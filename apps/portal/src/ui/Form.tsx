'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/types';
import s from './ui.module.css';

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/* A form bound to a server action. Shows the action's error or success message under the fields.
   `onDone` gets the returned state when the action succeeds (e.g. to show PINs). */
export function ActionForm({ action, children, className, resetOnOk, onDone, confirm, showOk = true }: {
  action: Action; children: ReactNode; className?: string; resetOnOk?: boolean;
  onDone?: (state: NonNullable<FormState>) => void; confirm?: string; showOk?: boolean;
}) {
  const [state, run] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const last = useRef<FormState>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok || state.data) { if (resetOnOk) ref.current?.reset(); onDone?.(state); }
  }, [state, resetOnOk, onDone]);
  return (
    <form
      ref={ref}
      action={run}
      className={className ?? s.form}
      onSubmit={confirm ? e => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {children}
      <Msg state={state} showOk={showOk} />
    </form>
  );
}

export function Msg({ state, showOk = true }: { state: FormState; showOk?: boolean }) {
  if (state?.error) return <p role="alert" className={s.badBox}>{state.error}</p>;
  if (state?.ok && showOk) return <p role="status" className={s.okBox}>{state.ok}</p>;
  return null;
}

export function Submit({ children, className, pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className ?? s.btn} disabled={pending} aria-busy={pending}>
      {pending ? pendingText ?? 'Working…' : children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {children}
      {hint && <span className={s.hint}>{hint}</span>}
    </label>
  );
}

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return <button type="button" className={s.btnGhost} onClick={() => window.print()}>{label}</button>;
}
