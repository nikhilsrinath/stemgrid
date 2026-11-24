'use client';

import { useState } from 'react';
import type { Slip } from '@/lib/students';
import { resetPins } from '@/app/[slug]/staff-actions';
import { ActionForm, Submit } from './Form';
import Slips from './Slips';
import s from './ui.module.css';

export default function StudentPin({ studentId, loginUrl }: { studentId: string; loginUrl: string }) {
  const [slips, setSlips] = useState<Slip[] | null>(null);
  return (
    <>
      {slips && <Slips slips={slips} loginUrl={loginUrl} onClose={() => setSlips(null)} />}
      <ActionForm action={resetPins} className={s.row} showOk={false} confirm="Give a new PIN? The old one stops working." onDone={st => setSlips((st.data as { slips: Slip[] }).slips)}>
        <input type="hidden" name="id" value={studentId} />
        <Submit>New PIN + login slip</Submit>
      </ActionForm>
    </>
  );
}
