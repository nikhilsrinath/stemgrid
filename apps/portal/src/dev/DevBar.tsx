'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { forceStatus, instituteStatus, resetDemo, runDailyNow, setWaveFull, waveState } from './actions';
import type { InstituteStatus } from '@/lib/types';

const STATUSES: InstituteStatus[] = ['approved', 'paid', 'onboarding', 'free_period', 'active', 'grace', 'suspended', 'lapsed'];
const NOT_SLUGS = new Set(['', 'dev', 'activate', 'privacy', 'terms', 'console', 'api', 'auth', 'find']);

/* The floating local-testing bar. Inline styles on purpose: it must look the same on every page,
   including the simulator, whose own CSS restyles every <button>. */
export default function DevBar({ date, shifted, accounts, learn, admin }: {
  date: string; shifted: boolean; accounts: { key: string; label: string; host: string }[]; learn: string; admin: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [inst, setInst] = useState<{ name: string; status: InstituteStatus } | null>(null);
  const [waves, setWaves] = useState<{ code: string; places: number; paid: number }[]>([]);
  const [pending, start] = useTransition();
  const seg = path.split('/')[1] ?? '';
  const slug = typeof window !== 'undefined' && location.hostname.startsWith('admin.') ? '' : NOT_SLUGS.has(seg) ? '' : seg;

  useEffect(() => { if (slug) instituteStatus(slug).then(setInst).catch(() => setInst(null)); else setInst(null); }, [slug, path]);
  useEffect(() => { waveState().then(setWaves).catch(() => {}); }, [path]);

  const bar: React.CSSProperties = { position: 'fixed', left: 12, bottom: 12, zIndex: 2147483000, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', maxWidth: 'calc(100vw - 24px)',
    padding: '7px 9px', borderRadius: 14, background: 'rgba(24,24,27,.92)', color: '#fff', font: '600 12px/1.2 "Plus Jakarta Sans", system-ui, sans-serif', boxShadow: '0 10px 30px rgba(0,0,0,.3)' };
  const btn: React.CSSProperties = { all: 'unset', cursor: 'pointer', padding: '5px 9px', borderRadius: 8, background: 'rgba(255,255,255,.12)', color: '#fff', font: 'inherit', whiteSpace: 'nowrap' };
  const sel: React.CSSProperties = { ...btn, appearance: 'auto', background: '#3f3f46', paddingRight: 4 };
  const pill: React.CSSProperties = { padding: '4px 8px', borderRadius: 99, background: '#E3121B', fontSize: 10.5, letterSpacing: '.06em' };
  const run = (fn: () => Promise<unknown>, okText?: string) => start(async () => {
    try { const r = await fn() as { ok?: string; error?: string } | undefined; setMsg(r?.error ? `⚠ ${r.error}` : r?.ok ?? okText ?? 'Done.'); router.refresh(); }
    catch (e) { setMsg(`⚠ ${e instanceof Error ? e.message : String(e)}`); }
  });
  const founding = waves.find(w => w.code === 'founding');

  if (!open) return <button style={{ ...bar, ...btn, background: 'rgba(24,24,27,.92)' }} onClick={() => setOpen(true)} aria-label="Open dev toolbar">DEV ▸</button>;
  return (
    <div style={bar} role="toolbar" aria-label="Local testing toolbar">
      <span style={pill}>LOCAL</span>
      <select style={sel} value="" aria-label="Switch user" onChange={e => { const a = accounts.find(x => x.key === e.target.value); if (a) location.assign(`${a.host === 'admin' ? admin : learn}/dev/as/${a.key}`); }}>
        <option value="" disabled>Switch user…</option>
        {accounts.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
      </select>
      <a style={{ ...btn, color: shifted ? '#FCD34D' : '#fff' }} href="/dev/clock" title="Pretend date">📅 {date}{shifted ? ' (pretend)' : ''}</a>
      <button style={btn} disabled={pending} onClick={() => run(runDailyNow)}>Run daily job</button>
      <a style={btn} href="/dev/mail">Mailbox</a>
      {inst && (
        <select style={sel} value={inst.status} aria-label="Force institute status" title={`Force ${inst.name}'s status`}
          onChange={e => run(() => forceStatus(slug, e.target.value as InstituteStatus), `${inst.name} is now ${e.target.value}.`)}>
          {STATUSES.includes(inst.status) ? null : <option value={inst.status}>{inst.status}</option>}
          {STATUSES.map(st => <option key={st} value={st}>{inst.name.split(' ')[0]}: {st}</option>)}
        </select>
      )}
      {founding && (
        <button style={btn} disabled={pending} title="Wave-full testing"
          onClick={() => run(() => setWaveFull('founding', founding.places > founding.paid), founding.places > founding.paid ? 'Founding wave is now full.' : 'Founding wave back to 10 places.')}>
          Founding {founding.paid}/{founding.places} {founding.places > founding.paid ? '→ fill' : '→ restore'}
        </button>
      )}
      <button style={btn} disabled={pending} onClick={() => { if (confirm('Wipe everything and re-seed the demo data?')) run(resetDemo); }}>Reset demo data</button>
      <a style={btn} href="/dev">More…</a>
      {(pending || msg) && <span style={{ fontWeight: 500, maxWidth: 420, opacity: .9 }}>{pending ? 'Working…' : msg}</span>}
      <button style={{ ...btn, background: 'none' }} onClick={() => setOpen(false)} aria-label="Hide dev toolbar">✕</button>
    </div>
  );
}
