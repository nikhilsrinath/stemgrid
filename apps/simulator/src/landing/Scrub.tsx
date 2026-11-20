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
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const mode = (el.dataset.scrub || 'through') as keyof typeof REST;
        let p = mode === 'pin' ? -r.top / Math.max(1, r.height - vh)
          : mode === 'out' ? -r.top / Math.max(1, r.height)
          : (vh - r.top) / (vh + r.height);
        if (still) p = REST[mode] ?? 0.5;
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    };
  }, []);
  return null;
}
