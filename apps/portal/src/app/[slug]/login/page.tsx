import { notFound } from 'next/navigation';
import { getInstituteBySlug } from '@/lib/auth';
import { MSG } from '@/lib/signin';
import InstituteFrame from '@/ui/InstituteFrame';
import { s } from '@/ui/bits';
import LoginForms from './LoginForms';

export async function generateMetadata({ params }: PageProps<'/[slug]/login'>) {
  const inst = await getInstituteBySlug((await params).slug);
  return { title: inst ? `Sign in · ${inst.name}` : 'Sign in' };
}

const REASONS: Record<string, string> = {
  signed_in_elsewhere: 'You were signed out because this account signed in on another device.',
  other_institute: MSG.otherInstitute,
  limit: MSG.limit,
  archived: "This account isn't active any more. Ask your teacher or admin.",
  no_account: "This account doesn't belong to an institute.",
};

export default async function Login({ params, searchParams }: PageProps<'/[slug]/login'>) {
  const { slug } = await params;
  const sp = await searchParams;
  const inst = await getInstituteBySlug(slug);
  if (!inst) notFound();
  const reason = REASONS[String(sp.reason ?? '')];
  const tab = sp.as === 'staff' ? 'staff' : 'student';
  return (
    <InstituteFrame inst={inst}>
      {reason && <p className={s.warnBox} style={{ marginBottom: 14 }}>{reason}</p>}
      <LoginForms slug={inst.slug} next={String(sp.next ?? '')} initial={tab} />
    </InstituteFrame>
  );
}
