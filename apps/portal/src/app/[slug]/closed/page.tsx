import { notFound } from 'next/navigation';
import { getInstituteBySlug } from '@/lib/auth';
import { CONTACT } from '@/lib/urls';
import InstituteFrame from '@/ui/InstituteFrame';
import { s } from '@/ui/bits';

/* Shown when the institute's portal isn't usable right now. */
export default async function Closed({ params, searchParams }: PageProps<'/[slug]/closed'>) {
  const inst = await getInstituteBySlug((await params).slug);
  if (!inst) notFound();
  const why = String((await searchParams).why ?? 'closed');
  const text = why === 'not_open'
    ? `${inst.name}'s portal isn't open yet. If you're the institute admin, use the activation link in your email.`
    : why === 'suspended'
      ? 'Student sign-in is paused for your institute right now. Please ask your institute. Your work is safe.'
      : `${inst.name}'s StemGrid portal is closed.`;
  return (
    <InstituteFrame inst={inst}>
      <div className={s.stack} style={{ textAlign: 'center' }}>
        <p className={s.warnBox}>{text}</p>
        <p className={s.muted}>StemGrid: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.tel}>{CONTACT.phone}</a></p>
      </div>
    </InstituteFrame>
  );
}
