import { pageMember } from '@/lib/auth';
import { portalOrigin } from '@/lib/urls';
import { InstituteLogo, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { updateProfile, uploadLogo } from '../../staff-actions';

export const metadata = { title: 'Settings · StemGrid' };

export default async function Settings({ params }: PageProps<'/[slug]/admin/settings'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  return (
    <>
      <PageHead title="Settings" lead={<>Your portal address: <b>{portalOrigin().replace(/^https?:\/\//, '')}/{inst.slug}</b>. To change it, contact StemGrid.</>} />
      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={s.h2}>Profile</h2>
          <ActionForm action={updateProfile}>
            <Field label="Institute name"><input className={s.input} name="name" defaultValue={inst.name} required maxLength={120} /></Field>
            <Field label="Type"><input className={s.input} name="type" defaultValue={inst.type} maxLength={60} placeholder="Academy, school, STEM centre…" /></Field>
            <Field label="Address"><textarea className={s.textarea} name="address" defaultValue={inst.address} maxLength={400} /></Field>
            <div className={s.formRow}>
              <Field label="City"><input className={s.input} name="city" defaultValue={inst.city} maxLength={80} /></Field>
              <Field label="State" hint="Decides CGST+SGST or IGST on invoices."><input className={s.input} name="state" defaultValue={inst.state} maxLength={80} /></Field>
            </div>
            <div className={s.formRow}>
              <Field label="GSTIN"><input className={s.input} name="gst_number" defaultValue={inst.gst_number} maxLength={20} /></Field>
              <Field label="Contact phone"><input className={s.input} name="contact_phone" defaultValue={inst.contact_phone} maxLength={20} /></Field>
            </div>
            <Field label="Contact person"><input className={s.input} name="contact_name" defaultValue={inst.contact_name} maxLength={80} /></Field>
            <Submit>Save profile</Submit>
          </ActionForm>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Logo</h2>
          <div className={s.row} style={{ marginBottom: 14 }}>
            <InstituteLogo name={inst.name} path={inst.logo_path} updatedAt={inst.updated_at} large />
            <span className={s.muted}>Shown above StemGrid&apos;s logo on your sign-in page. Square works best. PNG, JPG or WebP, under 1 MB.</span>
          </div>
          <ActionForm action={uploadLogo}>
            <input className={s.input} type="file" name="logo" accept="image/png,image/jpeg,image/webp" required />
            <Submit>Upload logo</Submit>
          </ActionForm>
          {inst.logo_path && (
            <ActionForm action={uploadLogo} className={s.row}>
              <input type="hidden" name="remove" value="1" />
              <Submit className={s.btnLink}>Remove logo</Submit>
            </ActionForm>
          )}
        </div>
      </div>
    </>
  );
}
