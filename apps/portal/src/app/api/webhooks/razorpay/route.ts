import { NextResponse, type NextRequest } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/payments';
import { settleCancelled, settleFailed, settlePaid } from '@/lib/payments/settle';

const ACTOR = { kind: 'system' as const, name: 'Razorpay webhook' };

/* Razorpay webhook. Verifies the signature over the raw body, then records the payment.
   Idempotent on the provider's payment id, so redeliveries are harmless. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verifyRazorpaySignature(body, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }
  let event: { event?: string; payload?: Record<string, { entity?: Record<string, unknown> }> };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const link = event.payload?.payment_link?.entity;
  const payment = event.payload?.payment?.entity;
  const orderId = (link?.id as string | undefined) ?? (payment?.notes as Record<string, string> | undefined)?.payment_link_id;
  try {
    switch (event.event) {
      case 'payment_link.paid':
        if (orderId && payment?.id) await settlePaid({ orderId, providerPaymentId: String(payment.id), raw: event }, ACTOR);
        break;
      case 'payment.failed':
        if (orderId) await settleFailed({ orderId, raw: event, reason: String(payment?.error_description ?? 'payment failed') }, ACTOR);
        break;
      case 'payment_link.cancelled':
      case 'payment_link.expired':
        if (orderId) await settleCancelled(orderId, ACTOR);
        break;
    }
  } catch (e) {
    console.error('[razorpay webhook]', e);
    return NextResponse.json({ error: 'retry' }, { status: 500 });   // Razorpay retries
  }
  return NextResponse.json({ ok: true });
}
