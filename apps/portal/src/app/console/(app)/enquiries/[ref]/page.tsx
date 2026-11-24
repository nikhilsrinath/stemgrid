import Link from 'next/link';
import { notFound } from 'next/navigation';
import { consoleBase } from '@/lib/auth';
import { getEnquiry } from '@/lib/enquiries';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getPricing } from '@/lib/pricing';
import { fmtDateTime } from '@/lib/dates';
import { suggestSlug } from '@/lib/rules';
import { inr } from '@/lib/money';
import { Badge, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { approveEnquiry, rejectEnquiryAction } from '../../../actions';

export default async function EnquiryDetail({ params }: PageProps<'/console/enquiries/[ref]'>) {
  const { ref } = await params;
  const b = await consoleBase();
  const e = await getEnquiry(ref);
  if (!e) notFound();
  const db = supabaseAdmin();
  const [{ data: inst }, pricing, { data: placed }] = await Promise.all([
    db.from('institutes').select('id, slug, status').eq('enquiry_ref', ref).maybeSingle(),
    getPricing(),
    db.from('institutes').select('wave_id').not('member_number', 'is', null),
  ]);
  const taken = (id: string) => (placed ?? []).filter(p => p.wave_id === id).length;
  const firstOpen = pricing.waves.find(w => taken(w.id) < w.places);

  const rows: [string, string | null | undefined][] = [
    ['Type', e.org_type], ['Curriculum', e.curriculum], ['Website', e.website], ['Location', `${e.city}, ${e.region}, ${e.country}`],
    ['Learners', e.learners], ['Levels', e.levels?.join(', ')], ['Contact', `${e.contact_name} (${e.designation})`],
    ['Email', e.email], ['Phone', e.phone], ['Prefers', [e.channel, e.best_time].filter(Boolean).join(', ')],
    ['Interests', e.interests?.join(', ')], ['Current setup', e.current_setup], ['Timeline', e.timeline],
    ['Decision role', e.decision_role], ['Budget', e.budget], ['Heard from', e.heard_from],
  ];

  return (
    <>
      <PageHead title={e.org_name} lead={<><span className={s.mono}>{e.ref}</span> · received {fmtDateTime(e.created_at)} · <Badge>{e.status}</Badge></>}>
        <Link className={s.btnGhost} href={`${b}/enquiries`}>All enquiries</Link>
      </PageHead>
      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={s.h2}>Details</h2>
          <table className={s.table}><tbody>
            {rows.filter(r => r[1]).map(([k, v]) => <tr key={k}><td className={s.muted} style={{ width: 140 }}>{k}</td><td>{v}</td></tr>)}
          </tbody></table>
          {e.message && <><h3 className={s.h3} style={{ marginTop: 14 }}>Message</h3><p style={{ whiteSpace: 'pre-wrap' }}>{e.message}</p></>}
          {e.notes && <><h3 className={s.h3} style={{ marginTop: 14 }}>Notes</h3><p className={s.small} style={{ whiteSpace: 'pre-wrap' }}>{e.notes}</p></>}
        </div>

        <div className={s.stack}>
          {inst ? (
            <div className={s.okBox}>Approved as <b>/{inst.slug}</b> ({inst.status}). <Link href={`${b}/institutes/${inst.id}`}>Open institute</Link></div>
          ) : ['won', 'lost', 'spam'].includes(e.status) ? (
            <div className={s.warnBox}>This enquiry is closed ({e.status}).</div>
          ) : (
            <>
              <div className={s.card}>
                <h2 className={s.h2}>Approve</h2>
                <ActionForm action={approveEnquiry}>
                  <input type="hidden" name="ref" value={e.ref} />
                  <Field label="Institute name"><input className={s.input} name="name" defaultValue={e.org_name} required maxLength={120} /></Field>
                  <Field label="Portal address" hint="learn.stemgrid.in/<this>. 3–40 lowercase letters, digits, hyphens; never reused.">
                    <input className={s.input} name="slug" defaultValue={suggestSlug(e.org_name)} required pattern="[a-z][a-z0-9\-]{2,39}" />
                  </Field>
                  <Field label="Wave offered" hint="A place is only taken when payment arrives.">
                    <select className={s.select} name="wave" defaultValue={firstOpen?.code ?? 'charter'}>
                      {pricing.waves.map(w => (
                        <option key={w.id} value={w.code}>{w.name}: {w.places - taken(w.id)} of {w.places} left · join {inr(w.join_price_paise)} + GST</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Send the activation link to"><input className={s.input} name="email" type="email" defaultValue={e.email} required /></Field>
                  <Submit pendingText="Approving…">Approve and send activation link</Submit>
                </ActionForm>
              </div>
              <div className={s.card}>
                <h2 className={s.h2}>Reject</h2>
                <ActionForm action={rejectEnquiryAction} confirm="Reject this enquiry?">
                  <input type="hidden" name="ref" value={e.ref} />
                  <Field label="Reason (kept in the enquiry's notes)"><input className={s.input} name="reason" maxLength={300} /></Field>
                  <label className={s.check}><input type="checkbox" name="spam" /> Mark as spam</label>
                  <Submit className={s.btnDanger}>Reject</Submit>
                </ActionForm>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
