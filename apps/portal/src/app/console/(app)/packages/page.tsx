import Link from 'next/link';
import { consoleBase } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { addonPrice, getPricing, type Pricing } from '@/lib/pricing';
import { inr } from '@/lib/money';
import type { Addon, Wave } from '@/lib/types';
import { Badge, PageHead, Stat, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { savePackage } from '../../actions';
import css from './packages.module.css';

export const metadata = { title: 'Packages · StemGrid console' };

const TABS = [
  ['sheet', 'Price sheet'], ['waves', 'Membership waves'], ['plans', 'Standard plans'], ['addons', 'Add-ons'], ['rules', 'Billing rules & terms'],
] as const;
type Tab = typeof TABS[number][0];

const rupees = (p: number | null | undefined) => (p == null ? '' : String(p / 100));

/* Every price and package term the portal quotes. Prices live in waves, wave_prices, plans, addons and
   pricing_settings; this page is the only place staff edit them. */
export default async function Packages({ searchParams }: PageProps<'/console/packages'>) {
  const q = String((await searchParams).tab ?? 'sheet');
  const tab: Tab = (TABS.find(t => t[0] === q)?.[0] ?? 'sheet');
  const b = await consoleBase();
  const [pricing, { data: placed }] = await Promise.all([
    getPricing(),
    supabaseAdmin().from('institutes').select('wave_id').not('member_number', 'is', null),
  ]);
  const taken = (w: Wave) => (placed ?? []).filter(p => p.wave_id === w.id).length;
  const open = pricing.waves.find(w => taken(w) < w.places);

  return (
    <>
      <PageHead title="Packages" lead="Every price and term the portal quotes: membership waves, Standard plans and add-ons. All prices exclude 18% GST." />

      <div className={s.grid4} style={{ marginBottom: 16 }}>
        {pricing.waves.map(w => (
          <Stat key={w.id} label={w.name} value={`${Math.max(0, w.places - taken(w))} of ${w.places} left`}
            note={`Join ${inr(w.join_price_paise)} · ${w.free_months} months unlimited`} />
        ))}
        <Stat label="Standard plans" value="Always open" note={open ? `Regular prices, no membership. Open wave: ${open.name}` : 'All membership places are taken: offer Standard'} />
        <Stat label="Annual option" value={`Pay ${pricing.settings.annual_paid_months}, get 12`} note={`Minimum term ${pricing.settings.minimum_paid_months} paid months`} />
      </div>

      <nav className={`${s.seg} ${css.tabs}`} aria-label="Package sections">
        {TABS.map(([k, label]) => <Link key={k} href={`${b}/packages?tab=${k}`} data-on={tab === k} scroll={false}>{label}</Link>)}
      </nav>

      {tab === 'sheet' && <Sheet pricing={pricing} />}
      {tab === 'waves' && (
        <div className={s.grid2}>
          {pricing.waves.map(w => <WaveForm key={w.id} wave={w} taken={taken(w)} pricing={pricing} />)}
        </div>
      )}
      {tab === 'plans' && <PlansForm pricing={pricing} />}
      {tab === 'addons' && <Addons addons={pricing.addons} />}
      {tab === 'rules' && <RulesForm pricing={pricing} />}
    </>
  );
}

/* ---------------------------------------------------------------- read-only price sheet (what we quote) */
function Sheet({ pricing }: { pricing: Pricing }) {
  const { plans, addons, waves, settings } = pricing;
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <h2 className={css.sectionTitle}>Plans</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead className={css.sheetHead}><tr>
              <th>Plan</th><th className={s.num}>Active students / month</th><th className={s.num}>Teacher accounts</th>
              <th className={s.num}>Monthly</th><th className={s.num}>Annual (pay {settings.annual_paid_months} months)</th><th className={s.num}>Per student</th>
              {waves.map(w => <th key={w.id} className={s.num}>{w.name}</th>)}
            </tr></thead>
            <tbody>{plans.map(p => (
              <tr key={p.code}>
                <td><b>{p.name}</b></td><td className={s.num}>{p.student_limit}</td><td className={s.num}>{p.teacher_limit}</td>
                <td className={s.num}><span className={css.price}>{inr(p.regular_price_paise)}</span></td>
                <td className={s.num}>{inr(p.regular_price_paise * settings.annual_paid_months)}</td>
                <td className={s.num}>{inr(Math.round(p.regular_price_paise / p.student_limit / 100) * 100)}</td>
                {waves.map(w => <td key={w.id} className={s.num}>{inr(pricing.price(w.id, p.code)?.price_paise)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>Wave columns are the locked member prices. Standard institutes pay the monthly column.</p>
      </div>

      <div className={s.card}>
        <h2 className={css.sectionTitle}>Add-ons</h2>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead className={css.sheetHead}><tr><th>Item</th><th>Price</th><th>Notes</th>{waves.map(w => <th key={w.id}>{w.name}</th>)}</tr></thead>
            <tbody>{addons.map(a => (
              <tr key={a.code}>
                <td><b>{a.name}</b></td>
                <td><span className={css.price}>{addonPrice(a, inr)}</span>{a.unit && <> {a.unit}</>}</td>
                <td className={s.muted}>{a.note}</td>
                {waves.map(w => {
                  const wp = pricing.price(w.id, 'starter');
                  const v = a.code === 'extra_students' ? wp && `${inr(wp.extra_pack_paise)} per 10`
                    : a.code === 'extra_teacher' ? wp && inr(wp.extra_teacher_paise)
                    : a.code === 'onboarding' ? `${inr(w.onboarding_paise)} (in joining)` : '';
                  return <td key={w.id} className={s.muted}>{v || '—'}</td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={css.sectionTitle}>How upgrades work</h2>
          <p style={{ fontSize: 14 }}>{settings.upgrade_note || <span className={s.muted}>No note yet. Add one under Billing rules &amp; terms.</span>}</p>
        </div>
        <div className={s.card}>
          <h2 className={css.sectionTitle}>Billing rules</h2>
          <ul className={css.terms}>{settings.billing_rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>

      <div className={s.grid3}>
        {waves.map(w => (
          <div key={w.id} className={s.card}>
            <div className={s.between}><h2 className={s.h2}>{w.name}</h2><Badge tone="red">{inr(w.join_price_paise)} to join</Badge></div>
            <ul className={css.terms} style={{ marginTop: 10 }}>{w.terms.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        ))}
        <div className={s.card}>
          <div className={s.between}><h2 className={s.h2}>Standard plans</h2><Badge>Regular prices</Badge></div>
          <ul className={css.terms} style={{ marginTop: 10 }}>{settings.standard_terms.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      </div>
      <p className={css.note}>All prices exclude <b>18% GST</b>. State this on every quote so it never causes friction at invoicing.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- edit forms */
function Money({ name, value, label }: { name: string; value: number | null | undefined; label: string }) {
  return <span className={css.money}><input className={`${s.input} ${css.cellInput}`} name={name} defaultValue={rupees(value)} inputMode="decimal" aria-label={label} required /></span>;
}

function WaveForm({ wave: w, taken, pricing }: { wave: Wave; taken: number; pricing: Pricing }) {
  return (
    <div className={s.card}>
      <div className={s.between} style={{ marginBottom: 12 }}>
        <h2 className={s.h2}>{w.name}</h2>
        <Badge tone={taken >= w.places ? 'bad' : 'ok'}>{taken} of {w.places} taken</Badge>
      </div>
      <ActionForm action={savePackage}>
        <input type="hidden" name="op" value="wave" /><input type="hidden" name="code" value={w.code} />
        <div className={s.formRow}>
          <Field label="Name"><input className={s.input} name="name" defaultValue={w.name} required maxLength={60} /></Field>
          <Field label="Places" hint={taken ? `At least ${taken} (already taken)` : 'A place is taken on payment'}><input className={s.input} type="number" name="places" min={taken} max={1000} defaultValue={w.places} required /></Field>
          <Field label="Unlimited period (months)" hint="Counted from go-live, including the paid month"><input className={s.input} type="number" name="free_months" min={1} max={12} defaultValue={w.free_months} required /></Field>
        </div>
        <div className={s.formRow}>
          <Field label="First month (₹)"><Money name="first_month" value={w.first_month_paise} label="First month" /></Field>
          <Field label="Onboarding (₹)"><Money name="onboarding" value={w.onboarding_paise} label="Onboarding" /></Field>
          <Field label="Pay to join (₹)" hint={`Bundle saving: ${inr(w.bundle_saving_paise)} (worked out when you save)`}><Money name="join_price" value={w.join_price_paise} label="Pay to join" /></Field>
        </div>
        <div className={s.tableWrap}>
          <table className={css.editTable}>
            <thead><tr><th>Locked member price</th><th>Monthly (₹)</th><th>Extra 10 students (₹)</th><th>Extra teacher (₹)</th></tr></thead>
            <tbody>{pricing.plans.map(p => {
              const wp = pricing.price(w.id, p.code);
              return (
                <tr key={p.code}>
                  <td>{p.name} <span className={s.muted} style={{ fontWeight: 400 }}>· regular {inr(p.regular_price_paise)}</span></td>
                  <td><Money name={`price_${p.code}`} value={wp?.price_paise} label={`${p.name} member price`} /></td>
                  <td><Money name={`pack_${p.code}`} value={wp?.extra_pack_paise} label={`${p.name} extra students`} /></td>
                  <td><Money name={`teacher_${p.code}`} value={wp?.extra_teacher_paise} label={`${p.name} extra teacher`} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <Field label="Terms" hint="One per line. Shown on the activation page before the institute accepts."><textarea className={s.textarea} name="terms" rows={8} defaultValue={w.terms.join('\n')} /></Field>
        <Submit pendingText="Saving…">Save {w.name}</Submit>
      </ActionForm>
    </div>
  );
}

function PlansForm({ pricing }: { pricing: Pricing }) {
  const months = pricing.settings.annual_paid_months;
  return (
    <div className={s.card}>
      <h2 className={s.h2}>Standard plans (regular prices)</h2>
      <p className={`${s.small} ${s.muted}`} style={{ margin: '4px 0 12px' }}>The plan sizes apply to members too; members pay the locked price for their wave (Membership waves tab). Annual and per-student columns update after saving.</p>
      <ActionForm action={savePackage}>
        <input type="hidden" name="op" value="plans" />
        <div className={s.tableWrap}>
          <table className={css.editTable}>
            <thead><tr><th>Plan</th><th>Active students / month</th><th>Teacher accounts</th><th>Monthly (₹)</th><th className={s.num}>Annual (pay {months})</th><th className={s.num}>Per student</th></tr></thead>
            <tbody>{pricing.plans.map(p => (
              <tr key={p.code}>
                <td><input className={`${s.input} ${css.cellInput}`} name={`name_${p.code}`} defaultValue={p.name} required maxLength={40} aria-label="Plan name" /></td>
                <td><input className={`${s.input} ${css.cellInput}`} type="number" name={`students_${p.code}`} min={1} defaultValue={p.student_limit} required aria-label={`${p.name} students`} /></td>
                <td><input className={`${s.input} ${css.cellInput}`} type="number" name={`teachers_${p.code}`} min={0} defaultValue={p.teacher_limit} required aria-label={`${p.name} teachers`} /></td>
                <td><Money name={`price_${p.code}`} value={p.regular_price_paise} label={`${p.name} monthly price`} /></td>
                <td className={css.computed}>{inr(p.regular_price_paise * months)}</td>
                <td className={css.computed}>{inr(Math.round(p.regular_price_paise / p.student_limit / 100) * 100)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Submit pendingText="Saving…">Save plans</Submit>
      </ActionForm>
    </div>
  );
}

function AddonFields({ a }: { a?: Addon }) {
  return (
    <div className={css.addonRow}>
      <Field label="Item"><input className={s.input} name="name" defaultValue={a?.name} required maxLength={80} /></Field>
      <Field label="Price (₹)"><span className={css.money}><input className={`${s.input} ${css.cellInput}`} name="price" defaultValue={rupees(a?.price_paise)} inputMode="decimal" /></span></Field>
      <Field label="Up to (₹)"><span className={css.money}><input className={`${s.input} ${css.cellInput}`} name="price_max" defaultValue={rupees(a?.price_max_paise)} inputMode="decimal" placeholder="range" /></span></Field>
      <Field label="Per"><input className={s.input} name="unit" defaultValue={a?.unit} maxLength={60} placeholder="month, each…" /></Field>
      <Field label="Notes"><input className={s.input} name="note" defaultValue={a?.note} maxLength={300} /></Field>
      <Field label="If no price"><input className={s.input} name="price_label" defaultValue={a?.price_label} maxLength={40} placeholder="Buy or rent" /></Field>
    </div>
  );
}

function Addons({ addons }: { addons: Addon[] }) {
  return (
    <div className={s.stack}>
      <div className={s.card}>
        <h2 className={s.h2}>Add-ons</h2>
        <p className={`${s.small} ${s.muted}`} style={{ margin: '4px 0 14px' }}>Regular prices. Leave the price empty for items priced on request (it shows the &ldquo;If no price&rdquo; text). Extra students, extra teachers and onboarding are used by billing, so they can be repriced but not removed. Members&apos; extra-student and teacher prices are set per wave.</p>
        <div className={s.stack}>
          {addons.map(a => (
            <ActionForm key={a.code} action={savePackage}>
              <input type="hidden" name="code" value={a.code} />
              <AddonFields a={a} />
              <div className={s.row}>
                <button type="submit" name="op" value="addon" className={`${s.btnGhost} ${s.btnSmall}`}>Save {a.name}</button>
                {a.system ? <span className={s.hint}>Used by billing</span>
                  : <button type="submit" name="op" value="addon_delete" className={`${s.btnDanger} ${s.btnSmall}`}>Remove</button>}
              </div>
            </ActionForm>
          ))}
        </div>
      </div>
      <div className={s.card}>
        <h2 className={s.h2}>Add an add-on</h2>
        <ActionForm action={savePackage} resetOnOk>
          <input type="hidden" name="op" value="addon" /><input type="hidden" name="new" value="1" />
          <AddonFields />
          <div><Submit pendingText="Adding…">Add</Submit></div>
        </ActionForm>
      </div>
    </div>
  );
}

function RulesForm({ pricing }: { pricing: Pricing }) {
  const st = pricing.settings;
  return (
    <div className={s.card}>
      <ActionForm action={savePackage}>
        <input type="hidden" name="op" value="settings" />
        <div className={s.formRow}>
          <Field label="Annual option: months paid for 12" hint="Pay 10, get 12"><input className={s.input} type="number" name="annual_paid_months" min={1} max={12} defaultValue={st.annual_paid_months} required /></Field>
          <Field label="Minimum term (paid months)" hint="After the unlimited period (members) or from go-live (Standard)"><input className={s.input} type="number" name="minimum_paid_months" min={0} max={24} defaultValue={st.minimum_paid_months} required /></Field>
          <Field label="Member price lock (months)" hint="From the end of the unlimited period"><input className={s.input} type="number" name="price_lock_months" min={0} max={120} defaultValue={st.price_lock_months} required /></Field>
        </div>
        <Field label="How upgrades work" hint="Shown on the price sheet."><textarea className={s.textarea} name="upgrade_note" rows={3} maxLength={600} defaultValue={st.upgrade_note} /></Field>
        <div className={s.grid2}>
          <Field label="Billing rules" hint="One per line."><textarea className={s.textarea} name="billing_rules" rows={7} defaultValue={st.billing_rules.join('\n')} /></Field>
          <Field label="Standard plan terms" hint="One per line. Shown on the activation page for Standard institutes."><textarea className={s.textarea} name="standard_terms" rows={7} defaultValue={st.standard_terms.join('\n')} /></Field>
        </div>
        <p className={`${s.small} ${s.muted}`}>Membership wave terms are on the Membership waves tab. The full legal terms (StemGrid_Membership.pdf, section 06) go on the /terms page once legal review is done.</p>
        <div><Submit pendingText="Saving…">Save rules and terms</Submit></div>
      </ActionForm>
    </div>
  );
}
