'use client';

/* Landing page footer, drawn like a powered circuit board.
   - The pin-hole grid lights up around the pointer (--mx/--my set on pointer move).
   - Each link has an LED and a wire that carries current on hover.
   - The STEMGRID wordmark lights letter by letter once when it scrolls into view
     (data-on), then lights under the pointer, with the neighbouring letters glowing. */

import Link from 'next/link';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import f from './footer.module.css';

const WORD = 'STEMGRID'.split('');

const Play = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
);
const Out = () => (
  <svg className={f.out} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
);

function Wire({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const inner = (
    <>
      <i className={f.led} aria-hidden="true" />
      <span className={f.wire} aria-hidden="true" />
      <span className={f.label}>{children}</span>
      {external && <Out />}
    </>
  );
  return (
    <li>
      {href.startsWith('/') ? <Link href={href} className={f.link}>{inner}</Link> : <a href={href} className={f.link}>{inner}</a>}
    </li>
  );
}

export default function Footer({ siteUrl }: { siteUrl: string }) {
  const root = useRef<HTMLElement>(null);
  const word = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = root.current;
    const w = word.current;
    if (!el || !w) return;

    let raf = 0;
    let x = 0, y = 0, inside = false;
    const draw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${x - r.left}px`);
        el.style.setProperty('--my', `${y - r.top}px`);
      });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY; inside = true;
      el.style.setProperty('--glow', '1');
      draw();
    };
    const leave = () => { inside = false; el.style.setProperty('--glow', '0'); };
    const scroll = () => { if (inside) draw(); };  // the page moves under a still pointer
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    addEventListener('scroll', scroll, { passive: true });

    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { w.dataset.on = ''; io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(w);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      removeEventListener('scroll', scroll);
      io.disconnect();
    };
  }, []);

  return (
    <footer ref={root} className={f.foot}>
      <div className={f.grid} aria-hidden="true" />
      <div className={f.lit} aria-hidden="true" />

      <div className={f.in}>
        {/* ---------- last call ---------- */}
        <div className={f.call}>
          <h2 className={f.callH}>Got a circuit in your head?</h2>
          <div className={f.callSide}>
            <p>Open the simulator and build it now. No download, no sign-up.</p>
            <Link href="/simulator" className={f.cta}><Play />Start building</Link>
          </div>
        </div>

        {/* ---------- links ---------- */}
        <div className={f.cols}>
          <div className={f.brand}>
            <span className={f.logo}>StemGrid<span className={f.beta}>Beta</span></span>
            <p>A 3D simulator of the StemGrid Quark electronics kit. Pick a board, plug in modules and code it in your browser.</p>
          </div>

          <nav aria-labelledby="ft-page">
            <h3 id="ft-page" className={f.colH}>On this page</h3>
            <ul className={f.list}>
              <Wire href="#how">How it works</Wire>
              <Wire href="#partner">Partner</Wire>
              <Wire href="#mission">Mission</Wire>
              <Wire href="#waitlist">Join the waitlist</Wire>
            </ul>
          </nav>

          <nav aria-labelledby="ft-more">
            <h3 id="ft-more" className={f.colH}>StemGrid</h3>
            <ul className={f.list}>
              <Wire href="/simulator">Open the simulator</Wire>
              <Wire href={siteUrl} external>StemGrid.in</Wire>
              <Wire href={`${siteUrl}/#contact`} external>Book a demo</Wire>
              <Wire href="tel:+918925172636">+91 89251 72636</Wire>
            </ul>
          </nav>

          <a href="#partner" className={f.partner}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/qbitio-logo.png" alt="Qbitio" width={1012} height={248} />
            <span>Technical partner</span>
          </a>
        </div>

        {/* ---------- the wordmark: hover the letters ---------- */}
        <p ref={word} className={f.word} aria-label="StemGrid">
          {WORD.map((c, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} aria-hidden="true">{c}</span>
          ))}
        </p>

        <div className={f.bar}>
          <p>© {new Date().getFullYear()} StemGrid. All rights reserved.</p>
          <a href="#top" className={f.top} onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}>
            Back to top
            <span className={f.topBtn} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
