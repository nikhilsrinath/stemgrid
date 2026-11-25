import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { monthStart } from '@/lib/dates';
import type { Addon, Plan, PricingSettings, Wave, WavePrice } from '@/lib/types';

const DEFAULT_SETTINGS: PricingSettings = {
  annual_paid_months: 10, minimum_paid_months: 3, price_lock_months: 36, upgrade_note: '', billing_rules: [], standard_terms: [],
};

/* Prices come only from these tables (edited in the console's Packages page). Never hardcode them in UI code. */
export const getPricing = cache(async () => {
  const sb = supabaseAdmin();
  const [w, p, wp, a, st] = await Promise.all([
    sb.from('waves').select('*').order('sort'),
    sb.from('plans').select('*').order('sort'),
    sb.from('wave_prices').select('*'),
    sb.from('addons').select('*').order('sort'),
    sb.from('pricing_settings').select('*').maybeSingle(),
  ]);
  const waves = (w.data ?? []) as Wave[];
  const plans = (p.data ?? []) as Plan[];
  const prices = (wp.data ?? []) as WavePrice[];
  const addons = (a.data ?? []) as Addon[];
  const settings = { ...DEFAULT_SETTINGS, ...(st.data ?? {}) } as PricingSettings;
  return {
    waves, plans, prices, addons, settings,
    wave: (id: string | null | undefined) => waves.find(x => x.id === id) ?? null,
    waveByCode: (code: string) => waves.find(x => x.code === code) ?? null,
    plan: (code: string | null | undefined) => plans.find(x => x.code === code) ?? null,
    price: (waveId: string | null | undefined, plan: string | null | undefined) =>
      prices.find(x => x.wave_id === waveId && x.plan_code === plan) ?? null,
    addon: (code: string) => addons.find(x => x.code === code) ?? null,
  };
});
export type Pricing = Awaited<ReturnType<typeof getPricing>>;

/* What an institute pays to join. A membership wave: its bundled joining price. Standard (no wave): onboarding
   plus the first month of the plan chosen at approval, at the regular price. */
export function joiningQuote(pricing: Pricing, waveId: string | null, planCode: string | null | undefined) {
  const wave = pricing.wave(waveId);
  if (wave) {
    return {
      kind: 'wave' as const, label: wave.name, amount: wave.join_price_paise,
      lines: [
        { label: 'First month', paise: wave.first_month_paise },
        { label: 'Onboarding and training', paise: wave.onboarding_paise },
        ...(wave.bundle_saving_paise ? [{ label: 'Bundle saving', paise: -wave.bundle_saving_paise }] : []),
      ],
    };
  }
  const plan = pricing.plan(planCode);
  const onboarding = pricing.addon('onboarding')?.price_paise ?? 0;
  const month = plan?.regular_price_paise ?? 0;
  return {
    kind: 'standard' as const, label: plan ? `Standard plan: ${plan.name}` : 'Standard plan', amount: month + onboarding,
    lines: [
      { label: `First month (${plan?.name ?? 'plan'})`, paise: month },
      ...(onboarding ? [{ label: 'Onboarding and training', paise: onboarding }] : []),
    ],
  };
}

/* "₹2,000", "₹150–₹200", or the add-on's label (e.g. "Buy or rent"). */
export function addonPrice(a: Addon, fmt: (p: number) => string) {
  if (a.price_paise == null) return a.price_label || 'On request';
  return a.price_max_paise != null && a.price_max_paise !== a.price_paise ? `${fmt(a.price_paise)}–${fmt(a.price_max_paise)}` : fmt(a.price_paise);
}

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
