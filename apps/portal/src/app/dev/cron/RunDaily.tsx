'use client';

import { useState, useTransition } from 'react';
import { runDailyNow } from '@/dev/actions';
import s from '@/ui/ui.module.css';

export default function RunDaily() {
  const [res, setRes] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className={s.stack}>
      <button className={s.btn} disabled={pending} onClick={() => start(async () => setRes(await runDailyNow()))}>{pending ? 'Running…' : 'Run daily job now'}</button>
      {res?.ok && <p className={s.okBox}>{res.ok}</p>}
      {res?.error && <p className={s.badBox}>{res.error}</p>}
    </div>
  );
}
