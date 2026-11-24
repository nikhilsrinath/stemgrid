import type { ReactNode } from 'react';
import Shell from '@/ui/Shell';
import InstituteBanners from '@/ui/InstituteBanners';
import { pageMember } from '@/lib/auth';
import { signOutPortal } from '../auth-actions';

export default async function TeacherLayout({ children, params }: LayoutProps<'/[slug]/teacher'>) {
  const { slug } = await params;
  const { user, institute: inst } = await pageMember(slug, ['teacher']);
  return (
    <Shell
      brand={{ name: inst.name, sub: 'Teacher', logoPath: inst.logo_path, updatedAt: inst.updated_at }}
      homeHref={`/${inst.slug}/teacher/batches`}
      nav={[{ href: `/${inst.slug}/teacher/batches`, label: 'My batches' }, { href: `/${inst.slug}/simulator`, label: 'Simulator' }, { href: `/${inst.slug}/help`, label: 'Help' }]}
      who={{ name: user.display_name, sub: user.email ?? 'Teacher' }}
      signOut={signOutPortal.bind(null, inst.slug)}
      banners={<InstituteBanners inst={inst} role={user.role} />}
    >
      {children as ReactNode}
    </Shell>
  );
}
