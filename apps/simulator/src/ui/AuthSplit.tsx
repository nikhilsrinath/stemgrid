import Link from 'next/link';
import type { ReactNode } from 'react';
import a from './auth.module.css';

export type AuthAside = {
  title: ReactNode;
  steps: string[];
  /** index of the highlighted step; -1 shows them all as equal points */
  active?: number;
};

/* Sign in / sign up / password pages: a light split screen. On the left a StemGrid-red panel
   with the plate's hole grid, a headline and three step cards; on the right the form. */
export default function AuthSplit({ aside, children, top, wide }: { aside: AuthAside; children: ReactNode; top?: ReactNode; wide?: boolean }) {
  const active = aside.active ?? 0;
  return (
    <div className={a.root}>
      <aside className={a.panel}>
        <Link href="/" className={a.logo}>
          <span className={a.mark} aria-hidden="true"><i /><i /><i /><i /></span>
          StemGrid<span className={a.beta}>Beta</span>
        </Link>
        <div className={a.panelBody}>
          <h2 className={a.panelTitle}>{aside.title}</h2>
          <ol className={a.stepCards}>
            {aside.steps.map((t, i) => (
              <li key={t} className={a.stepCard} data-on={i === active} data-done={active >= 0 && i < active}>
                <span className={a.stepNum}>{active >= 0 && i < active ? '✓' : i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
      <main className={a.main}>
        <div className={a.mainTop}>
          <Link href="/" className={`${a.logo} ${a.logoMobile}`}>
            <span className={a.mark} aria-hidden="true"><i /><i /><i /><i /></span>
            StemGrid
          </Link>
          {top ?? <Link href="/simulator" className={a.topLink}>Try the simulator →</Link>}
        </div>
        <div className={`${a.formWrap} ${wide ? a.formWide : ''}`}>{children}</div>
      </main>
    </div>
  );
}
