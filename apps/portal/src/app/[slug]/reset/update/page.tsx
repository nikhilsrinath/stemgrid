import { notFound } from 'next/navigation';
import { getAuth, getInstituteBySlug } from '@/lib/auth';
import InstituteFrame from '@/ui/InstituteFrame';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { s } from '@/ui/bits';
import { setNewPassword } from '../../auth-actions';

export default async function UpdatePassword({ params }: PageProps<'/[slug]/reset/update'>) {
  const inst = await getInstituteBySlug((await params).slug);
  if (!inst) notFound();
  const { uid } = await getAuth();
  return (
    <InstituteFrame inst={inst} title="Choose a new password">
      {!uid ? <p className={s.warnBox}>This reset link has expired. Ask for a new one.</p> : (
        <ActionForm action={setNewPassword.bind(null, inst.slug)}>
          <Field label="New password" hint="At least 8 characters."><input className={s.input} type="password" name="password" minLength={8} autoComplete="new-password" required /></Field>
          <Field label="New password again"><input className={s.input} type="password" name="password2" minLength={8} autoComplete="new-password" required /></Field>
          <Submit className={`${s.btn} ${s.full}`}>Save password</Submit>
        </ActionForm>
      )}
    </InstituteFrame>
  );
}
