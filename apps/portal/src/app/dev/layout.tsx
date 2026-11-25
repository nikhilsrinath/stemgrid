import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isLocal } from '@/lib/mode';
import { Mark, s } from '@/ui/bits';

export const metadata = { title: 'Local testing · StemGrid' };
export const dynamic = 'force-dynamic';

/* Local testing pages. They don't exist outside local mode (the proxy 404s them too). */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (!isLocal()) notFound();
  return (
    <div className={s.root}>
      <header className={s.top}>
        <Link href="/dev" className={s.brand}><Mark height={34} /><span><span className={s.brandName}>Local testing</span><span className={s.brandSub}>Fake services · never in production</span></span></Link>
        <nav className={s.nav}>
          {[['/dev/clock', 'Date'], ['/dev/cron', 'Daily job'], ['/dev/mail', 'Mailbox'], ['/', 'Portal']].map(([h, l]) => <Link key={h} className={s.navLink} href={h}>{l}</Link>)}
        </nav>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  );
}
