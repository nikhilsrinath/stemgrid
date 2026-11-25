'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/* iPads: keep the viewport tag right for the page you are on, and make the page re-measure after a turn.
   - Leaving the simulator (it locks zoom, see simulator/layout.tsx) by a client-side link could leave its tag behind,
     and with zoom locked a page turned to landscape stays laid out at its portrait width: a white strip down the side.
   - After an orientation change WebKit sometimes keeps the old layout width anyway; touching the tag makes it measure again. */
const SITE = 'width=device-width, initial-scale=1';
const APP = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

export default function ViewportGuard() {
  const path = usePathname();
  useEffect(() => {
    const want = path === '/simulator' || path.startsWith('/simulator/') ? APP : SITE;
    const metas = () => {
      const all = [...document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]')];
      if (all.length) return all;
      const m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m);
      return [m];
    };
    const set = (c: string) => metas().forEach(m => { if (m.content !== c) m.content = c; });
    set(want);
    let w = window.innerWidth, raf = 0;
    const turned = () => {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      set(want.replace('initial-scale=1', 'initial-scale=1.0'));    // same meaning, different text: WebKit re-reads it
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => set(want));
    };
    window.addEventListener('orientationchange', turned);
    window.addEventListener('resize', turned);
    return () => {
      window.removeEventListener('orientationchange', turned);
      window.removeEventListener('resize', turned);
      cancelAnimationFrame(raf);
    };
  }, [path]);
  return null;
}
