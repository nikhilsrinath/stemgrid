import { notFound } from 'next/navigation';
import { getInstituteBySlug } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/tokens';
import { now } from '@/lib/clock';
import { ROLE_LABEL, type Role } from '@/lib/types';
import InstituteFrame from '@/ui/InstituteFrame';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { s } from '@/ui/bits';
import { acceptInvite } from '../../auth-actions';

export default async function Invite({ params }: PageProps<'/[slug]/invite/[token]'>) {
  const { slug, token } = await params;
  const inst = await getInstituteBySlug(slug);
  if (!inst) notFound();
  const { data: inv } = await supabaseAdmin().from('invites').select('*').eq('token_hash', hashToken(token)).maybeSingle();
  const valid = inv && inv.institute_id === inst.id && !inv.used_at && !inv.revoked_at && new Date(inv.expires_at) > now();
  return (
    <InstituteFrame inst={inst} title={valid ? `You're invited as ${ROLE_LABEL[inv.role as Role].toLowerCase()}` : undefined}>
      {!valid ? <p className={s.warnBox}>This invite has expired or was already used. Ask your institute admin for a new one.</p> : (
        <ActionForm action={acceptInvite.bind(null, inst.slug, token)}>
          <Field label="Email"><input className={s.input} value={inv.email} disabled readOnly /></Field>
          <Field label="Your name"><input className={s.input} name="name" defaultValue={inv.display_name} required maxLength={80} /></Field>
          <Field label="Password" hint="At least 8 characters. Already have a StemGrid simulator account with this email? Use that password."><input className={s.input} type="password" name="password" minLength={8} autoComplete="new-password" required /></Field>
          <Field label="Password again"><input className={s.input} type="password" name="password2" minLength={8} autoComplete="new-password" required /></Field>
          <Submit className={`${s.btn} ${s.full}`} pendingText="Setting up…">Accept invite</Submit>
        </ActionForm>
      )}
    </InstituteFrame>
  );
}
