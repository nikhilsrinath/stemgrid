import type { ReactNode } from 'react';
import Shell from '@/ui/Shell';
import InstituteBanners from '@/ui/InstituteBanners';
import { pageMember } from '@/lib/auth';
import { activeCount, studentLimit } from '@/lib/pricing';
import { STATUS_LABEL } from '@/lib/types';
import { signOutPortal } from '../auth-actions';

export default async function AdminLayout({ children, params }: LayoutProps<'/[slug]/admin'>) {
  const { slug } = await params;
  const { user, institute: inst } = await pageMember(slug, ['institute_admin']);
  const [count, limit] = await Promise.all([activeCount(inst.id), studentLimit(inst.id)]);
  const b = `/${inst.slug}/admin`;
  return (
    <Shell
      brand={{ name: inst.name, sub: `Admin · ${STATUS_LABEL[inst.status]}`, logoPath: inst.logo_path, updatedAt: inst.updated_at }}
      homeHref={`${b}/dashboard`}
      nav={[
        { href: `${b}/dashboard`, label: 'Dashboard' }, { href: `${b}/batches`, label: 'Batches' },
        { href: `${b}/teachers`, label: 'Teachers' }, { href: `${b}/students`, label: 'Students' },
        { href: `${b}/billing`, label: 'Billing' }, { href: `${b}/settings`, label: 'Settings' },
        { href: `/${inst.slug}/simulator`, label: 'Simulator' },
      ]}
      who={{ name: user.display_name, sub: user.email ?? 'Admin' }}
      signOut={signOutPortal.bind(null, inst.slug)}
      banners={<InstituteBanners inst={inst} role={user.role} usage={{ count, limit }} />}
    >
      {children as ReactNode}
    </Shell>
  );
}
