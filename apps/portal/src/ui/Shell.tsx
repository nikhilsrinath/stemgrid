import type { ReactNode } from 'react';
import Link from 'next/link';
import { InstituteLogo, Mark } from './bits';
import NavLinks from './NavLinks';
import s from './ui.module.css';

export type NavItem = { href: string; label: string };

/* The app frame for portal and console pages: brand, section nav, who's signed in, sign out. */
export default function Shell({ brand, homeHref, nav, who, signOut, banners, children }: {
  brand: { name: string; sub: string; logoPath?: string | null; updatedAt?: string; console?: boolean };
  homeHref: string; nav: NavItem[]; who: { name: string; sub: string };
  signOut: () => Promise<void>; banners?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={s.root}>
      <header className={s.top}>
        <Link href={homeHref} className={s.brand}>
          {brand.console ? <Mark /> : <InstituteLogo name={brand.name} path={brand.logoPath ?? null} updatedAt={brand.updatedAt} />}
          <span>
            <span className={s.brandName}>{brand.name}</span>
            <span className={s.brandSub}>{brand.sub}</span>
          </span>
        </Link>
        <NavLinks items={nav} />
        <div className={s.who}>
          <span className={s.whoName}>{who.name}<span>{who.sub}</span></span>
          <form action={signOut}><button className={`${s.btnGhost} ${s.btnSmall}`}>Sign out</button></form>
        </div>
      </header>
      <main className={s.main}>
        {banners && <div className={s.stack} style={{ marginBottom: 18 }}>{banners}</div>}
        {children}
      </main>
    </div>
  );
}
