import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { monthStart } from '@/lib/dates';
import type { Plan, Wave, WavePrice } from '@/lib/types';

/* Prices come only from these tables (seeded from the membership terms). Never hardcode them in UI code. */
export const getPricing = cache(async () => {
  const sb = supabaseAdmin();
  const [w, p, wp] = await Promise.all([
    sb.from('waves').select('*').order('sort'),
    sb.from('plans').select('*').order('sort'),
    sb.from('wave_prices').select('*'),
  ]);
  const waves = (w.data ?? []) as Wave[];
  const plans = (p.data ?? []) as Plan[];
  const prices = (wp.data ?? []) as WavePrice[];
  return {
    waves, plans, prices,
    wave: (id: string | null | undefined) => waves.find(x => x.id === id) ?? null,
    waveByCode: (code: string) => waves.find(x => x.code === code) ?? null,
    plan: (code: string | null | undefined) => plans.find(x => x.code === code) ?? null,
    price: (waveId: string | null | undefined, plan: string | null | undefined) =>
      prices.find(x => x.wave_id === waveId && x.plan_code === plan) ?? null,
  };
});

/* The smallest plan whose limit covers the peak; above the biggest plan, add packs of 10. */
export function recommendPlan(peak: number, plans: Plan[]) {
  const sorted = [...plans].sort((a, b) => a.student_limit - b.student_limit);
  const fit = sorted.find(p => p.student_limit >= peak);
  if (fit) return { plan: fit, extraPacks: 0 };
  const top = sorted[sorted.length - 1];
  return { plan: top, extraPacks: Math.ceil((peak - top.student_limit) / 10) };
}

/* ---------------------------------------------------------------- usage */
export async function activeCount(instituteId: string, month = monthStart(now())) {
  const { count } = await supabaseAdmin().from('monthly_active_students')
    .select('student_id', { count: 'exact', head: true }).eq('institute_id', instituteId).eq('month', month);
  return count ?? 0;
}

export async function studentLimit(instituteId: string) {
  const { data } = await supabaseAdmin().rpc('student_limit', { p_institute: instituteId });
  return (data as number | null) ?? 300;
}

export async function teacherLimit(instituteId: string) {
  const { data } = await supabaseAdmin().rpc('teacher_limit', { p_institute: instituteId });
  return data as number | null;     // null = not limited (no plan yet)
}

/* Highest monthly active count since a date (for plan placement). */
export async function peakActive(instituteId: string, since: string | null) {
  let q = supabaseAdmin().from('monthly_active_students').select('month').eq('institute_id', instituteId);
  if (since) q = q.gte('month', monthStart(new Date(since)));
  const { data } = await q.limit(100000);
  const byMonth = new Map<string, number>();
  for (const r of data ?? []) byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + 1);
  return Math.max(0, ...byMonth.values());
}
