import Link from 'next/link';
import { now } from '@/lib/clock';
import { addDays, daysBetween, fmtDate } from '@/lib/dates';
import type { Institute, Role } from '@/lib/types';
import { s } from './bits';

/* Status banners at the top of staff pages: grace, read-only, free period ending, usage. */
export default function InstituteBanners({ inst, role, usage }: { inst: Institute; role: Role; usage?: { count: number; limit: number } }) {
  const t = now();
  const out: React.ReactNode[] = [];
  if (inst.status === 'grace') {
    const until = addDays(new Date(inst.grace_started_at ?? t), 7);
    out.push(<div key="g" className={s.warnBox}><span><b>Payment due.</b> Everything keeps working until {fmtDate(until)}. After that students can&apos;t sign in and staff accounts become read-only.{role === 'institute_admin' && <> See <Link href={`/${inst.slug}/admin/billing`}>Billing</Link>.</>}</span></div>);
  }
  if (inst.status === 'suspended') {
    out.push(<div key="s" className={s.badBox}><span><b>Read-only.</b> The payment is overdue, so students can&apos;t sign in and changes are paused. Contact StemGrid to get running again. Your data is safe.</span></div>);
  }
  if (inst.status === 'free_period' && inst.free_period_ends_at && role === 'institute_admin') {
    const days = daysBetween(t, new Date(inst.free_period_ends_at));
    if (days <= 14) out.push(<div key="f" className={s.info}><span>Your free period ends in <b>{days} day{days === 1 ? '' : 's'}</b> ({fmtDate(inst.free_period_ends_at)}). <Link href={`/${inst.slug}/admin/billing`}>Check your plan</Link>.</span></div>);
  }
  if (usage && role === 'institute_admin' && usage.limit > 0) {
    const pct = (usage.count / usage.limit) * 100;
    if (pct >= 100) out.push(<div key="u" className={s.badBox}><span><b>Student limit reached:</b> {usage.count} of {usage.limit} this month. New students who haven&apos;t signed in this month will be asked to check with you.</span></div>);
    else if (pct >= 80) out.push(<div key="u" className={s.warnBox}><span><b>{Math.floor(pct)}% of this month&apos;s student limit used</b> ({usage.count} of {usage.limit}).</span></div>);
  }
  return out.length ? <>{out}</> : null;
}
