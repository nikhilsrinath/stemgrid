import type { ReactNode } from 'react';
import Link from 'next/link';
import { logoUrl, initials, STATUS_LABEL, type InstituteStatus } from '@/lib/types';
import s from './ui.module.css';

export { s };

/* The StemGrid Tech Labs logo (public/brand/stemgrid-logo.png, transparent, 640x287). */
export function Mark({ height = 40 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/stemgrid-logo.png" alt="StemGrid Tech Labs" width={Math.round(height * 640 / 287)} height={height} className={s.mark} style={{ height }} />;
}

export function StemGridLogo({ href = '/' }: { href?: string }) {
  return <Link href={href} className={s.logo} aria-label="StemGrid home"><Mark height={34} /></Link>;
}

export function InstituteLogo({ name, path, updatedAt, large }: { name: string; path: string | null; updatedAt?: string; large?: boolean }) {
  const url = logoUrl(path, updatedAt);
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={`${name} logo`} className={large ? s.instLogoLg : s.instLogo} />;
  return <span className={large ? s.instInitialsLg : s.instInitials} aria-hidden>{initials(name)}</span>;
}

export function PageHead({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.pageHead}>
      <div>
        <h1 className={s.h1}>{title}</h1>
        {lead && <p className={s.lead}>{lead}</p>}
      </div>
      {children && <div className={s.row}>{children}</div>}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}</span>
      {note && <span className={s.statNote}>{note}</span>}
    </div>
  );
}

export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const level = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : 'ok';
  return <div className={s.meter} data-level={level} role="meter" aria-valuenow={value} aria-valuemax={max}><i style={{ width: `${pct}%` }} /></div>;
}

export function Badge({ tone, children }: { tone?: 'ok' | 'warn' | 'bad' | 'red' | 'blue'; children: ReactNode }) {
  return <span className={s.badge} data-tone={tone}>{children}</span>;
}

const STATUS_TONE: Partial<Record<InstituteStatus, 'ok' | 'warn' | 'bad' | 'red' | 'blue'>> = {
  approved: 'blue', awaiting_payment: 'warn', paid: 'ok', onboarding: 'blue', free_period: 'ok', active: 'ok',
  grace: 'warn', suspended: 'bad', lapsed: 'bad', cancelled: 'bad', rejected: 'bad',
};
export function StatusBadge({ status }: { status: InstituteStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}
