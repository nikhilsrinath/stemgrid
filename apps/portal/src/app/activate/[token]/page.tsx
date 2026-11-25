import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/tokens';
import { now } from '@/lib/clock';
import { getPricing, joiningQuote } from '@/lib/pricing';
import { gstOn, inr } from '@/lib/money';
import { CONTACT } from '@/lib/urls';
import { paymentsEnabled } from '@/lib/payments';
import type { Institute } from '@/lib/types';
import { InstituteLogo, Mark, s } from '@/ui/bits';
import Activate from './Activate';

export const metadata = { title: 'Activate your institute · StemGrid' };

/* learn.stemgrid.in/activate/<token>: verify email, set password, accept terms + consent, pay. */
export default async function ActivatePage({ params, searchParams }: PageProps<'/activate/[token]'>) {
  const { token } = await params;
  const paymentId = String((await searchParams).payment ?? '');
  const db = supabaseAdmin();
  const { data: t } = await db.from('activation_tokens').select('*').eq('token_hash', hashToken(token)).maybeSingle();
  const inst = t ? (await db.from('institutes').select('*').eq('id', t.institute_id).maybeSingle<Institute>()).data : null;
  const pricing = await getPricing();
  const wave = pricing.wave(inst?.wave_id);
  const { data: sub } = inst ? await db.from('subscriptions').select('plan_code').eq('institute_id', inst.id).maybeSingle() : { data: null };
  const quote = joiningQuote(pricing, inst?.wave_id ?? null, sub?.plan_code);

  const frame = (body: React.ReactNode) => (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={s.authCardWide}>
          <div className={s.authHead}>
            {inst ? <InstituteLogo name={inst.name} path={inst.logo_path} large /> : <Mark />}
            <h1 className={s.h1}>{inst ? inst.name : 'Activate your institute'}</h1>
            <span className={s.poweredBy}><Mark height={24} /> membership</span>
          </div>
          {body}
          <div className={s.authFoot}><Link href="/terms">Membership terms</Link><Link href="/privacy">Privacy</Link><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><span>{CONTACT.phone}</span></div>
        </div>
      </div>
    </div>
  );

  if (!t || !inst) return frame(<p className={s.badBox}>This activation link isn&apos;t valid. Check you copied the whole link, or ask StemGrid for a new one.</p>);

  // already joined: confirmation (also the return page after paying)
  if (inst.member_number) {
    const { data: inv } = await db.from('invoices').select('number').eq('institute_id', inst.id).order('issued_at').limit(1).maybeSingle();
    return frame(
      <div className={s.stack} style={{ textAlign: 'center' }}>
        <p className={s.okBox} style={{ justifyContent: 'center' }}>Payment received. Welcome to StemGrid!</p>
        <p style={{ fontSize: 18 }}>You are member <b>#{inst.member_number}</b> · {wave?.name}</p>
        {inv && <p className={s.muted}>Invoice {inv.number} is on your billing page.</p>}
        <p className={s.muted}>Our team will contact you to schedule onboarding and training. Your free period starts when onboarding is complete (or 7 days after payment, whichever comes first).</p>
        <p><Link className={s.btn} href={`/${inst.slug}/admin/setup`}>Set up your portal</Link></p>
      </div>,
    );
  }
  // Standard (no wave): paid, no member number
  if (!inst.wave_id && inst.paid_at) {
    return frame(
      <div className={s.stack} style={{ textAlign: 'center' }}>
        <p className={s.okBox} style={{ justifyContent: 'center' }}>Payment received. Welcome to StemGrid!</p>
        <p style={{ fontSize: 18 }}>{quote.label}</p>
        <p className={s.muted}>Our team will contact you to schedule onboarding and training. Your plan starts when onboarding is complete (or 7 days after payment, whichever comes first).</p>
        <p><Link className={s.btn} href={`/${inst.slug}/admin/setup`}>Set up your portal</Link></p>
      </div>,
    );
  }
  if (inst.wave_full) {
    return frame(<p className={s.warnBox}>Thank you for your payment. The last {wave?.name} place was taken just before it arrived. Our team will contact you within one working day to offer a place in the next wave, or a full refund.</p>);
  }
  if (!['approved', 'awaiting_payment'].includes(inst.status)) {
    return frame(<p className={s.warnBox}>This institute can&apos;t be activated (status: {inst.status}). Please contact StemGrid.</p>);
  }

  // returning from the payment page before the webhook has arrived
  if (paymentId) {
    const { data: pay } = await db.from('payments').select('status').eq('id', paymentId).eq('institute_id', inst.id).maybeSingle();
    if (pay?.status === 'created' || pay?.status === 'paid') {
      return frame(
        <div className={s.stack} style={{ textAlign: 'center' }}>
          <meta httpEquiv="refresh" content="3" />
          <p className={s.info} style={{ justifyContent: 'center' }}>Confirming your payment… this page refreshes by itself.</p>
          <p className={s.muted}>If you closed the payment page without paying, <Link href={`/activate/${token}`}>go back and try again</Link>.</p>
        </div>,
      );
    }
    if (pay?.status === 'failed') {
      // fall through to the pay step with a message
    }
  }

  // activated without online payment: StemGrid collects the payment and records it in the console
  if (!paymentsEnabled() && inst.status === 'awaiting_payment' && inst.terms_accepted_at) {
    return frame(
      <div className={s.stack} style={{ textAlign: 'center' }}>
        <p className={s.okBox} style={{ justifyContent: 'center' }}>You&apos;re all set up. Thank you!</p>
        <p className={s.muted}>{wave
          ? <>Our team will contact you about the joining payment ({wave.name}). As soon as it&apos;s received, your {wave.name} place is confirmed, you get your member number and invoice, and your portal opens at <b>/{inst.slug}</b>.</>
          : <>Our team will contact you about the joining payment ({quote.label}). As soon as it&apos;s received, you get your invoice and your portal opens at <b>/{inst.slug}</b>.</>}</p>
        <p className={s.muted}>Questions: {CONTACT.email} · {CONTACT.phone}</p>
      </div>,
    );
  }

  const expired = !!t.used_at || new Date(t.expires_at) < now();
  if (expired) return frame(<p className={s.badBox}>This activation link has expired or was replaced by a newer one. Ask StemGrid to send a new link.</p>);

  const step = !t.email_verified_at ? 'verify' : !t.user_id ? 'account' : !inst.terms_accepted_at ? 'terms' : 'pay';
  let failed = false;
  if (paymentId) {
    const { data: pay } = await db.from('payments').select('status').eq('id', paymentId).maybeSingle();
    failed = pay?.status === 'failed' || pay?.status === 'cancelled';
  }
  const amount = quote.amount;
  return frame(
    <Activate
      token={token}
      step={step}
      email={t.email}
      failed={failed}
      institute={{ name: inst.name, city: inst.city, state: inst.state, address: inst.address, gst: inst.gst_number, contactName: inst.contact_name }}
      pkg={wave || sub?.plan_code ? {
        name: quote.label, standard: !wave, terms: wave ? wave.terms : pricing.settings.standard_terms,
        lines: quote.lines.map(l => ({ label: l.label, value: l.paise < 0 ? `− ${inr(-l.paise)}` : inr(l.paise) })),
        join: inr(amount), gst: inr(gstOn(amount)), total: inr(amount + gstOn(amount)),
      } : null}
      termsVersion={process.env.TERMS_VERSION ?? 'unversioned'}
      online={paymentsEnabled()}
    />,
  );
}
