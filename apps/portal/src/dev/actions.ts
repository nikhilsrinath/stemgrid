'use server';

import { spawn } from 'node:child_process';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { isLocal } from '@/lib/mode';
import { writeDevState, now } from '@/lib/clock';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runDaily } from '@/lib/daily';
import { logActivity } from '@/lib/activity';
import { settleCancelled, settleFailed, settlePaid } from '@/lib/payments/settle';
import { STATUS_LABEL, type FormState, type InstituteStatus } from '@/lib/types';

/* Local testing only. Every action refuses to run outside local mode. */
function local() { if (!isLocal()) throw new Error('Local mode only'); }
const DEV = { kind: 'system' as const, name: 'Dev toolbar' };

export async function setClock(_: FormState, fd: FormData): Promise<FormState> {
  local();
  if (fd.get('reset') === '1') { writeDevState({ offsetMs: 0 }); revalidatePath('/', 'layout'); return { ok: 'Back to the real date.' }; }
  const days = fd.get('days');
  let target: number;
  if (days != null && String(days) !== '') target = now().getTime() + Number(days) * 86_400_000;
  else {
    const d = String(fd.get('date') ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'Pick a date.' };
    target = new Date(`${d}T10:00:00+05:30`).getTime();
  }
  writeDevState({ offsetMs: target - Date.now() });
  revalidatePath('/', 'layout');
  return { ok: `Pretend date set to ${new Date(target).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.` };
}

export async function runDailyNow(): Promise<FormState> {
  local();
  const r = await runDaily();
  revalidatePath('/', 'layout');
  return { ok: r.done.length ? `Done: ${r.done.join(' · ')}` : 'Ran. Nothing was due today.', error: r.errors.length ? r.errors.join(' · ') : undefined, data: r };
}

export async function instituteStatus(slug: string) {
  local();
  const { data } = await supabaseAdmin().from('institutes').select('id, name, status').eq('slug', slug).maybeSingle();
  return data as { id: string; name: string; status: InstituteStatus } | null;
}

/* Force a status to see how each state looks (bypasses the transition guard, local only). */
export async function forceStatus(slug: string, status: InstituteStatus) {
  local();
  if (!(status in STATUS_LABEL)) return;
  const db = supabaseAdmin();
  const { data: inst } = await db.from('institutes').select('id, status').eq('slug', slug).single();
  const { error } = await db.rpc('dev_force_status', { p_institute: inst!.id, p_status: status, p_now: now().toISOString() });
  if (error) throw new Error(error.message);
  await logActivity({ actor: DEV, action: 'dev.status_forced', instituteId: inst!.id, before: { status: inst!.status }, after: { status } });
  revalidatePath('/', 'layout');
}

/* Wave-full testing: shrink the Founding wave to its paid count, or put it back to 10. */
export async function setWaveFull(code: string, full: boolean) {
  local();
  const db = supabaseAdmin();
  const { data: w } = await db.from('waves').select('id').eq('code', code).single();
  const { count } = await db.from('institutes').select('id', { count: 'exact', head: true }).eq('wave_id', w!.id).not('member_number', 'is', null);
  await db.from('waves').update({ places: full ? (count ?? 0) : 10 }).eq('id', w!.id);
  revalidatePath('/', 'layout');
}

export async function waveState() {
  local();
  const db = supabaseAdmin();
  const { data: waves } = await db.from('waves').select('id, code, places').order('sort');
  const { data: taken } = await db.from('institutes').select('wave_id').not('member_number', 'is', null);
  return (waves ?? []).map(w => ({ code: w.code as string, places: w.places as number, paid: (taken ?? []).filter(t => t.wave_id === w.id).length }));
}

/* The mock payment page's buttons: the same code paths as the real Razorpay webhook. */
export async function mockPayment(paymentId: string, outcome: 'paid' | 'failed' | 'cancelled', returnTo: string): Promise<FormState> {
  local();
  const db = supabaseAdmin();
  const { data: pay } = await db.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (!pay?.provider_order_id) return { error: 'Payment not found.' };
  const actor = { kind: 'system' as const, name: 'Mock payment' };
  const raw = { mock: true, outcome };
  if (outcome === 'paid') await settlePaid({ orderId: pay.provider_order_id, providerPaymentId: `mockpay_${paymentId}`, raw }, actor);
  else if (outcome === 'failed') await settleFailed({ orderId: pay.provider_order_id, raw, reason: 'Test failure (mock)' }, actor);
  else await settleCancelled(pay.provider_order_id, actor);
  return { data: { returnTo } };
}

/* Wipe and re-seed the local database (same as `pnpm portal:reset`, without restarting the app). */
export async function resetDemo(): Promise<FormState> {
  local();
  const script = path.join(process.cwd(), 'scripts', 'local.mjs');
  const code = await new Promise<number>(resolve => {
    const p = spawn(process.execPath, [script, '--reset', '--no-dev'], { cwd: process.cwd(), stdio: 'inherit', env: process.env });
    p.on('exit', c => resolve(c ?? 1));
  });
  revalidatePath('/', 'layout');
  return code === 0 ? { ok: 'Demo data reset. Sign in again with the toolbar.' } : { error: 'Reset failed: see the terminal running the portal.' };
}
