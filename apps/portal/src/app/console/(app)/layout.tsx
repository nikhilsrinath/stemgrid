import type { ReactNode } from 'react';
import Shell from '@/ui/Shell';
import { consoleBase, pageStaff } from '@/lib/auth';
import { staffSignOut } from '../actions';

export const metadata = { title: 'Console · StemGrid' };

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const staff = await pageStaff();
  const b = await consoleBase();
  const nav = [
    { href: `${b}/enquiries`, label: 'Enquiries' },
    { href: `${b}/institutes`, label: 'Institutes' },
    { href: `${b}/onboarding`, label: 'Onboarding' },
    { href: `${b}/members`, label: 'Members' },
    { href: `${b}/packages`, label: 'Packages' },
    { href: `${b}/payments`, label: 'Payments' },
    { href: `${b}/tutorials`, label: 'Tutorials' },
    { href: `${b}/team`, label: 'Team' },
  ];
  return (
    <Shell brand={{ name: 'StemGrid console', sub: 'Institute memberships', console: true }} homeHref={`${b}/enquiries`}
      nav={nav} who={{ name: staff.name, sub: 'StemGrid team' }} signOut={staffSignOut}>
      {children}
    </Shell>
  );
}
