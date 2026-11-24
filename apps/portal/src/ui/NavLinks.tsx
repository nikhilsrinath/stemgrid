'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './ui.module.css';

export default function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  // the longest matching link is the current section
  const on = items.filter(i => path === i.href || path.startsWith(i.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
  return (
    <nav className={s.nav} aria-label="Sections">
      {items.map(i => (
        <Link key={i.href} href={i.href} className={s.navLink} data-on={on?.href === i.href} aria-current={on?.href === i.href ? 'page' : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
