import { now } from '@/lib/clock';
import { isLocal } from '@/lib/mode';
import accounts from '../../dev/demo-accounts.json';
import DevBar from './DevBar';

/* Local mode only: a small floating bar on every page (brief §19.5). */
export default function DevToolbar() {
  if (!isLocal()) return null;
  const t = now();
  const shifted = Math.abs(t.getTime() - Date.now()) > 60_000;
  return (
    <DevBar
      date={t.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
      shifted={shifted}
      accounts={accounts.map(a => ({ key: a.key, label: a.label, host: a.host }))}
      learn={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://learn.localhost:3002'}
      admin={process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://admin.localhost:3002'}
    />
  );
}
