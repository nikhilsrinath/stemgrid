import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity, type Actor } from '@/lib/activity';
import { now } from '@/lib/clock';
import { loadInstitute, recordPayment, startGrace } from '@/lib/lifecycle';
import { notifyStaff } from '@/lib/mail';

/* What happens when a provider says a payment succeeded or failed. The webhook and the local mock
   payment page both end up here, so they behave the same. Idempotent: the same event twice is a no-op. */

export async function settlePaid(p: { orderId: string; providerPaymentId: string; raw: unknown }, actor: Actor) {
  const db = supabaseAdmin();
  const { data: pay } = await db.from('payments').select('*').eq('provider_order_id', p.orderId).maybeSingle();
  if (!pay) return { ok: false as const, reason: 'unknown order' };
  if (pay.status === 'paid') {
    // already recorded: make sure the follow-up ran (it is itself idempotent), then stop
    await recordPayment(pay.id, actor).catch(() => {});
    return { ok: true as const, already: true };
  }
  const { data: dup } = await db.from('payments').select('id').eq('provider_payment_id', p.providerPaymentId).maybeSingle();
  if (dup && dup.id !== pay.id) return { ok: true as const, already: true };
  const { data: updated, error } = await db.from('payments')
    .update({ status: 'paid', provider_payment_id: p.providerPaymentId, paid_at: now().toISOString(), raw: p.raw as object })
    .eq('id', pay.id).neq('status', 'paid').select('id').maybeSingle();
  if (error) throw error;
  if (!updated) return { ok: true as const, already: true };     // a parallel delivery won the race
  await logActivity({ actor, action: 'payment.received', instituteId: pay.institute_id, targetType: 'payment', targetId: pay.id, after: { kind: pay.kind, amount_paise: pay.amount_paise, gst_paise: pay.gst_paise } });
  const res = await recordPayment(pay.id, actor);
  return { ok: true as const, result: res };
}

export async function settleFailed(p: { orderId: string; raw: unknown; reason?: string }, actor: Actor) {
  const db = supabaseAdmin();
  const { data: pay } = await db.from('payments').select('*').eq('provider_order_id', p.orderId).maybeSingle();
  if (!pay || pay.status === 'paid') return { ok: false as const };
  await db.from('payments').update({ status: 'failed', raw: p.raw as object, note: p.reason ?? '' }).eq('id', pay.id);
  await logActivity({ actor, action: 'payment.failed', instituteId: pay.institute_id, targetType: 'payment', targetId: pay.id, after: { kind: pay.kind, reason: p.reason } });
  const inst = await loadInstitute(pay.institute_id);
  if (pay.kind === 'monthly' && inst.status === 'active') await startGrace(inst, actor, p.reason ?? 'payment failed');
  else await notifyStaff(`Payment failed: ${inst.name}`, `${pay.kind} payment ${pay.id} failed${p.reason ? `: ${p.reason}` : ''}.`);
  return { ok: true as const };
}

export async function settleCancelled(orderId: string, actor: Actor) {
  const db = supabaseAdmin();
  const { data: pay } = await db.from('payments').select('*').eq('provider_order_id', orderId).maybeSingle();
  if (!pay || pay.status !== 'created') return;
  await db.from('payments').update({ status: 'cancelled' }).eq('id', pay.id);
  await logActivity({ actor, action: 'payment.cancelled', instituteId: pay.institute_id, targetType: 'payment', targetId: pay.id });
}
