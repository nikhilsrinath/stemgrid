import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { inr } from '@/lib/money';
import { PageHead, s } from '@/ui/bits';

/* Where the payment provider sends the admin back after paying (monthly and add-on payments). */
export default async function BillingResult({ params, searchParams }: PageProps<'/[slug]/admin/billing/result'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const id = String((await searchParams).payment ?? '');
  const { data: pay } = /^[0-9a-f-]{36}$/i.test(id)
    ? await supabaseAdmin().from('payments').select('*').eq('id', id).eq('institute_id', inst.id).maybeSingle()
    : { data: null };
  return (
    <div className={s.narrow}>
      <PageHead title="Payment" />
      {!pay ? <p className={s.warnBox}>We couldn&apos;t find that payment.</p>
        : pay.status === 'paid' ? <p className={s.okBox}>Thank you: {inr(pay.amount_paise + pay.gst_paise)} received. Your invoice is on the billing page.</p>
        : pay.status === 'created' ? <><meta httpEquiv="refresh" content="3" /><p className={s.info}>Confirming your payment… this page refreshes by itself.</p></>
        : <p className={s.badBox}>The payment didn&apos;t go through ({pay.status}). You haven&apos;t been charged.</p>}
      <p style={{ marginTop: 16 }}><Link className={s.btnGhost} href={`/${inst.slug}/admin/billing`}>Back to billing</Link></p>
    </div>
  );
}
