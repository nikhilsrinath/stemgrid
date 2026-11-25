import Link from 'next/link';
import BrandLogo from '@/ui/BrandLogo';
import type { ReactNode } from 'react';
import HeroGrid from '@/landing/HeroGrid';
import s from './ui.module.css';
import { HOME_HREF } from '@/lib/hosts';

/* Red pin-hole page with one cream card in the middle, for sign in / sign up / onboarding. */
export default function AuthShell({ children, wide, top }: { children: ReactNode; wide?: boolean; top?: ReactNode }) {
  return (
    <div className={`${s.root} ${s.auth}`}>
      <HeroGrid />
      <header className={s.authTop}>
        <Link href={HOME_HREF} className={s.logo} aria-label="StemGrid home"><BrandLogo height={40} /><span className={s.beta}>Beta</span></Link>
        {top ?? <Link href="/simulator" className={s.topLink}>Try the simulator</Link>}
      </header>
      <main className={s.authMain}>
        <div className={`${s.card} ${wide ? s.cardWide : ''}`} data-hero-copy>{children}</div>
      </main>
    </div>
  );
}
