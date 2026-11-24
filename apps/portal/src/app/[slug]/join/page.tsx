import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getInstituteBySlug } from '@/lib/auth';
import { cleanJoinCode } from '@/lib/rules';
import InstituteFrame from '@/ui/InstituteFrame';
import { Field } from '@/ui/Form';
import { s } from '@/ui/bits';

export default async function Join({ params, searchParams }: PageProps<'/[slug]/join'>) {
  const inst = await getInstituteBySlug((await params).slug);
  if (!inst) notFound();
  const code = String((await searchParams).code ?? '');
  if (code) redirect(`/${inst.slug}/join/${cleanJoinCode(code)}`);
  return (
    <InstituteFrame inst={inst} title="Join a batch">
      <form className={s.form}>
        <Field label="Batch code" hint="6 letters and numbers, from your teacher.">
          <input className={s.pinInput} name="code" maxLength={6} required autoFocus autoCapitalize="characters" spellCheck={false} />
        </Field>
        <button className={`${s.btn} ${s.full}`}>Continue</button>
      </form>
      <p className={`${s.small} ${s.muted}`} style={{ textAlign: 'center', marginTop: 14 }}>Already have a username and PIN? <Link href={`/${inst.slug}/login`}>Sign in</Link></p>
    </InstituteFrame>
  );
}
