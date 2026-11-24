import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInstituteBySlug } from '@/lib/auth';
import InstituteFrame from '@/ui/InstituteFrame';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { s } from '@/ui/bits';
import { requestReset } from '../auth-actions';

export default async function Reset({ params, searchParams }: PageProps<'/[slug]/reset'>) {
  const inst = await getInstituteBySlug((await params).slug);
  if (!inst) notFound();
  const expired = (await searchParams).expired;
  return (
    <InstituteFrame inst={inst} title="Reset your password (teachers and admins)">
      {expired && <p className={s.warnBox} style={{ marginBottom: 14 }}>That link has expired or was already used. Ask for a new one.</p>}
      <ActionForm action={requestReset.bind(null, inst.slug)} resetOnOk>
        <Field label="Email"><input className={s.input} type="email" name="email" required autoFocus /></Field>
        <Submit className={`${s.btn} ${s.full}`}>Email me a reset link</Submit>
      </ActionForm>
      <p className={`${s.small} ${s.muted}`} style={{ marginTop: 14, textAlign: 'center' }}>Students: ask your teacher for a new PIN. <Link href={`/${inst.slug}/login`}>Back to sign in</Link></p>
    </InstituteFrame>
  );
}
