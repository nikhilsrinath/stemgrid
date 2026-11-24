import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInstituteBySlug } from '@/lib/auth';
import { CONTACT } from '@/lib/urls';
import InstituteFrame from '@/ui/InstituteFrame';
import { s } from '@/ui/bits';

export default async function Help({ params }: PageProps<'/[slug]/help'>) {
  const inst = await getInstituteBySlug((await params).slug);
  if (!inst) notFound();
  return (
    <InstituteFrame inst={inst} wide>
      <div className={s.stack}>
        <h2 className={s.h2}>Help</h2>
        <details className={s.more} open><summary>I&apos;m a student and forgot my PIN</summary><p className={s.muted}>Ask your teacher or your institute admin. They can give you a new PIN straight away.</p></details>
        <details className={s.more}><summary>It says &ldquo;Too many tries&rdquo;</summary><p className={s.muted}>After 5 wrong PINs the account waits 15 minutes. Ask your teacher for a new PIN, or try again later.</p></details>
        <details className={s.more}><summary>I was signed out suddenly</summary><p className={s.muted}>Each account can be signed in on one device at a time. Signing in somewhere else signs out the other device.</p></details>
        <details className={s.more}><summary>I have a batch code</summary><p className={s.muted}>Go to <Link href={`/${inst.slug}/join`}>Join a batch</Link> and type the 6-character code.</p></details>
        <details className={s.more}><summary>I&apos;m a teacher or admin and forgot my password</summary><p className={s.muted}>Use <Link href={`/${inst.slug}/reset`}>reset password</Link>. We&apos;ll email you a link.</p></details>
        <hr className={s.divider} />
        <p>Still stuck? Contact StemGrid: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.tel}>{CONTACT.phone}</a></p>
        <p><Link className={s.btnGhost} href={`/${inst.slug}/login`}>Back to sign in</Link></p>
      </div>
    </InstituteFrame>
  );
}
