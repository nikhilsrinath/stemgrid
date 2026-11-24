import { supabaseAdmin } from '@/lib/supabase/admin';
import { safeNext } from '@/lib/safe-next';
import { inr } from '@/lib/money';
import { Mark, s } from '@/ui/bits';
import MockPay from './MockPay';

/* The mock payment page (PAYMENTS_PROVIDER=mock). Its buttons call the same code as the real webhook. */
export default async function Pay({ params, searchParams }: PageProps<'/dev/pay/[id]'>) {
  const { id } = await params;
  const back = safeNext(String((await searchParams).return ?? ''), '/');
  const { data: pay } = await supabaseAdmin().from('payments').select('*, institutes(name)').eq('id', id).maybeSingle();
  return (
    <div className={s.centered} style={{ minHeight: '70vh' }}>
      <div className={s.authCard}>
        <div className={s.authHead}><Mark /><h1 className={s.h1}>Test payment</h1><p className={s.muted}>Pretend payment gateway. No money moves.</p></div>
        {!pay ? <p className={s.badBox}>Payment not found.</p> : (
          <div className={s.stack}>
            <ul className={s.list}>
              <li><span>For</span><b>{(pay.institutes as { name: string } | null)?.name}</b></li>
              <li><span>What</span><span>{pay.kind}</span></li>
              <li><span>Amount</span><span>{inr(pay.amount_paise)} + GST {inr(pay.gst_paise)}</span></li>
              <li><b>Total</b><b>{inr(pay.amount_paise + pay.gst_paise)}</b></li>
              <li><span>Status</span><span>{pay.status}</span></li>
            </ul>
            {pay.status === 'created' ? <MockPay id={pay.id} back={back} /> : <a className={s.btnGhost} href={back}>Back</a>}
          </div>
        )}
      </div>
    </div>
  );
}
