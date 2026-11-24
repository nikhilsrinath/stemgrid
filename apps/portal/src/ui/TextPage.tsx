import type { ReactNode } from 'react';
import Link from 'next/link';
import { Mark, s } from './bits';

export default function TextPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={s.authCardWide}>
          <div className={s.authHead}><Mark /><h1 className={s.h1}>{title}</h1></div>
          <div className={s.stack}>{children}</div>
          <div className={s.authFoot}><Link href="/">StemGrid portal</Link></div>
        </div>
      </div>
    </div>
  );
}
