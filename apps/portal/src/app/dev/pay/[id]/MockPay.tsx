'use client';

import { useState, useTransition } from 'react';
import { mockPayment } from '@/dev/actions';
import s from '@/ui/ui.module.css';

export default function MockPay({ id, back }: { id: string; back: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const go = (outcome: 'paid' | 'failed' | 'cancelled') => start(async () => {
    try {
      const r = await mockPayment(id, outcome, back);
      if (r?.error) { setErr(r.error); return; }
      location.assign(back);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  });
  return (
    <div className={s.stack}>
      <button className={s.btn} disabled={pending} onClick={() => go('paid')}>Pay successfully</button>
      <button className={s.btnGhost} disabled={pending} onClick={() => go('failed')}>Fail payment</button>
      <button className={s.btnGhost} disabled={pending} onClick={() => go('cancelled')}>Cancel</button>
      {pending && <p className={s.muted}>Processing…</p>}
      {err && <p className={s.badBox}>{err}</p>}
    </div>
  );
}
