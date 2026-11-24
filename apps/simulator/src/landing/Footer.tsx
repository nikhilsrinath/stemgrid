'use client';

/* Landing page footer. Near-black, so it carries straight on from the membership finale.
   A closing line with one button, the brand and three link columns, a large quiet wordmark,
   and the last line. Client component only for the smooth "Back to top". */

import Link from 'next/link';
import type { ReactNode } from 'react';
import f from './footer.module.css';
import { smoothTo } from './SmoothScroll';

function Item({ href, children }: { href: string; children: ReactNode }) {
  const out = /^https?:/.test(href);
  return (
    <li>
      {href.startsWith('/')
        ? <Link href={href}>{children}</Link>
        : <a href={href} {...(out ? { target: '_blank', rel: 'noopener' } : {})}>{children}{out && <span className={f.out} aria-hidden="true">↗</span>}</a>}
    </li>
  );
}

export default function Footer({ siteUrl }: { siteUrl: string }) {
  return (
    <footer className={f.foot}>
      <div className={f.in}>
        {/* ---------- closing line ---------- */}
        <div className={f.call}>
          <h2 className={f.callH}>Got a circuit in your head?</h2>
          <Link href="/simulator" className={f.cta}>Start building</Link>
        </div>

        {/* ---------- brand and links ---------- */}
        <div className={f.cols}>
          <div className={f.brand}>
            <Link href="/" className={f.logo}>
              <span className={f.mark} aria-hidden="true"><i /><i /><i /><i /></span>
              StemGrid
            </Link>
            <p>A real electronics kit in your browser. Snap modules onto a plate, plug in the cables and code it in Python.</p>
          </div>

          <nav aria-labelledby="ft-page">
            <h3 id="ft-page" className={f.colH}>On this page</h3>
            <ul className={f.list}>
              <Item href="#features">Features</Item>
              <Item href="#how">Watch a build</Item>
              <Item href="#mission">Mission</Item>
              <Item href="#partners">Partners</Item>
              <Item href="#membership">Membership</Item>
            </ul>
          </nav>

          <nav aria-labelledby="ft-more">
            <h3 id="ft-more" className={f.colH}>StemGrid</h3>
            <ul className={f.list}>
              <Item href="/simulator">Open the simulator</Item>
              <Item href={siteUrl}>StemGrid.in</Item>
              <Item href={`${siteUrl}/#contact`}>Book a demo</Item>
            </ul>
          </nav>

          <div>
            <h3 className={f.colH}>Get in touch</h3>
            <ul className={f.list}>
              <Item href="tel:+918925172636">+91 89251 72636</Item>
            </ul>
            <div className={f.partner}>
              <span>Technical partner</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/qbitio-logo.png" alt="Qbitio" width={1012} height={248} />
            </div>
          </div>
        </div>

        {/* ---------- wordmark ---------- */}
        <p className={f.word} aria-hidden="true">StemGrid</p>

        {/* ---------- last line ---------- */}
        <div className={f.bar}>
          <p>© {new Date().getFullYear()} StemGrid. All rights reserved.</p>
          <a href="#top" className={f.top} onClick={e => { e.preventDefault(); smoothTo(0); }}>
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
