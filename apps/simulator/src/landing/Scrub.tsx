'use client';

/* Scroll scrubbing for the landing page. Every element with data-scrub gets a CSS variable
   --p (0..1) for how far the page has scrolled through it; the effects themselves live in
   landing.module.css as calc(var(--p) ...). Modes:
     data-scrub         0 when the top enters at the bottom of the screen, 1 when the bottom leaves at the top
     data-scrub="out"   0 at rest, 1 once it has scrolled fully off the top (the hero)
     data-scrub="pin"   0..1 over a tall section with a sticky inner block
   With reduced motion, --p is fixed at a resting value. */

import { useEffect } from 'react';

const REST = { pin: 1, out: 0, through: 0.5 };

export default function Scrub() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-scrub]')];
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const last = els.map(() => '');
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf); raf = 0;
      const vh = innerHeight;
      // read every rect first, then write: interleaving would force a layout per element
      const rects = els.map(el => el.getBoundingClientRect());
      els.forEach((el, i) => {
        const r = rects[i];
        const mode = (el.dataset.scrub || 'through') as keyof typeof REST;
        let p = mode === 'pin' ? -r.top / Math.max(1, r.height - vh)
          : mode === 'out' ? -r.top / Math.max(1, r.height)
          : (vh - r.top) / (vh + r.height);
        if (still) p = REST[mode] ?? 0.5;
        const v = Math.min(1, Math.max(0, p)).toFixed(4);
        if (v !== last[i]) { last[i] = v; el.style.setProperty('--p', v); }   // off-screen ones stay put: no restyle
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('sg:scroll', update);   // SmoothScroll.tsx, same frame as it scrolls
    addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('sg:scroll', update);
      removeEventListener('resize', onScroll);
    };
  }, []);
  return null;
}
