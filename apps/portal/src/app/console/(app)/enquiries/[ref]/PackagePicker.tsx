'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Field } from '@/ui/Form';
import s from '@/ui/ui.module.css';

export type PackageOption = { code: string; label: string; quote: string; full: boolean; terms: string };
export type PlanOption = { code: string; label: string; quote: string };

/* Approve form: offer a membership wave, or a Standard plan (no membership) once the places are gone. */
export default function PackagePicker({ waves, plans, defaultCode, packagesHref }: {
  waves: PackageOption[]; plans: PlanOption[]; defaultCode: string; packagesHref: string;
}) {
  const [code, setCode] = useState(defaultCode);
  const [plan, setPlan] = useState(plans[0]?.code ?? '');
  const standard = code === 'standard';
  const wave = waves.find(w => w.code === code);
  const quote = standard ? plans.find(p => p.code === plan)?.quote : wave?.quote;

  return (
    <>
      <Field label="Package offered" hint={standard ? 'Regular prices: no free period, member number or price lock.' : 'A place is only taken when payment arrives.'}>
        <select className={s.select} name="wave" value={code} onChange={e => setCode(e.target.value)}>
          <optgroup label="Membership">
            {waves.map(w => <option key={w.code} value={w.code}>{w.label}</option>)}
          </optgroup>
          <optgroup label="No membership">
            <option value="standard">Standard plan (regular prices)</option>
          </optgroup>
        </select>
      </Field>
      {standard && (
        <Field label="Plan">
          <select className={s.select} name="plan" value={plan} onChange={e => setPlan(e.target.value)}>
            {plans.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
          </select>
        </Field>
      )}
      {wave?.full && <p className={s.warnBox}>{wave.label.split(':')[0]} has no places left. If they pay, they&apos;ll have to be moved to another package or refunded.</p>}
      {quote && (
        <p className={s.info} style={{ flexDirection: 'column', gap: 2 }}>
          <span>They pay to join: <b>{quote}</b></span>
          {!standard && wave?.terms && <span className={s.small}>{wave.terms}</span>}
          <span className={s.small}><Link href={packagesHref}>Change prices and terms</Link></span>
        </p>
      )}
    </>
  );
}
