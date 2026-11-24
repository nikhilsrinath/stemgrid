import type { ReactNode } from 'react';
import Shell from '@/ui/Shell';
import { pageMember } from '@/lib/auth';
import { signOutPortal } from '../auth-actions';

export default async function StudentLayout({ children, params }: LayoutProps<'/[slug]/student'>) {
  const { slug } = await params;
  const { user, institute: inst } = await pageMember(slug, ['student']);
  return (
    <Shell
      brand={{ name: inst.name, sub: 'Student', logoPath: inst.logo_path, updatedAt: inst.updated_at }}
      homeHref={`/${inst.slug}/student/home`}
      nav={[
        { href: `/${inst.slug}/student/home`, label: 'Home' },
        { href: `/${inst.slug}/student/projects`, label: 'My projects' },
        { href: `/${inst.slug}/simulator`, label: 'Simulator' },
      ]}
      who={{ name: user.display_name, sub: user.username ?? '' }}
      signOut={signOutPortal.bind(null, inst.slug)}
    >
      {children as ReactNode}
    </Shell>
  );
}
