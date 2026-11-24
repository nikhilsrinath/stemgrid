import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isLocal } from '@/lib/mode';
import { portalOrigin } from '@/lib/urls';

/* Payment provider seam (brief §4, §11). Razorpay in production; a mock in local mode whose
   "Test payment" page calls the same recordPayment() code as the real webhook. To swap providers,
   implement Provider and return it from provider(). */
export type Checkout = { orderId: string; url: string };
export type CheckoutInput = {
  paymentId: string; instituteId: string; amountTotalPaise: number; description: string;
  customer: { name: string; email: string; phone?: string }; returnPath: string;
};
export interface Provider {
  name: 'razorpay' | 'mock';
  createCheckout(input: CheckoutInput): Promise<Checkout>;
}

const mock: Provider = {
  name: 'mock',
  async createCheckout(input) {
    const orderId = `mock_${input.paymentId}`;
    return { orderId, url: `/dev/pay/${input.paymentId}?return=${encodeURIComponent(input.returnPath)}` };
  },
};

const razorpay: Provider = {
  name: 'razorpay',
  async createCheckout(input) {
    const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
    if (!id || !secret) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.');
    // Payment Links API: https://razorpay.com/docs/api/payments/payment-links/
    const r = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: input.amountTotalPaise, currency: 'INR', description: input.description.slice(0, 2048),
        reference_id: input.paymentId,
        customer: { name: input.customer.name, email: input.customer.email, contact: input.customer.phone || undefined },
        notify: { sms: false, email: false }, reminder_enable: false,
        notes: { institute_id: input.instituteId, payment_id: input.paymentId },
        callback_url: portalOrigin() + input.returnPath, callback_method: 'get',
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Razorpay: ${j?.error?.description ?? r.status}`);
    return { orderId: j.id as string, url: j.short_url as string };
  },
};

/* Online payment is switched on by setting the Razorpay keys (or the mock in local mode). Without
   them, activation ends with "StemGrid will contact you about payment" and staff record the payment
   in the console (Record bank transfer), which runs the same recordPayment() path. */
export function paymentsEnabled() {
  if (process.env.PAYMENTS_PROVIDER === 'mock') return isLocal();
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function provider(): Provider {
  if (process.env.PAYMENTS_PROVIDER === 'mock') {
    if (!isLocal()) throw new Error('PAYMENTS_PROVIDER=mock is only allowed in local mode.');
    return mock;
  }
  return razorpay;
}

/* Razorpay signs the raw webhook body with HMAC-SHA256 using the webhook secret. */
export function verifyRazorpaySignature(body: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
