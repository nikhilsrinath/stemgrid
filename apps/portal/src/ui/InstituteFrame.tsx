import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Institute } from '@/lib/types';
import { InstituteLogo, Mark, s } from './bits';

/* Centered card with the institute's name and logo above StemGrid's (brief §4.1).
   The privacy page is linked from every sign-in page (brief §16). */
export default function InstituteFrame({ inst, title, wide, children }: { inst: Pick<Institute, 'name' | 'logo_path' | 'updated_at' | 'slug'>; title?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={wide ? s.authCardWide : s.authCard}>
          <div className={s.authHead}>
            <InstituteLogo name={inst.name} path={inst.logo_path} updatedAt={inst.updated_at} large />
            <h1 className={s.h1} style={{ fontSize: 24 }}>{inst.name}</h1>
            <span className={s.poweredBy}><Mark /> StemGrid</span>
            {title && <p className={s.muted}>{title}</p>}
          </div>
          {children}
          <div className={s.authFoot}>
            <Link href={`/${inst.slug}/help`}>Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/">Not your institute?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
