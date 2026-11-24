'use client';

/* The red swirl that carries the problem section into the features section.
   One fixed, full-screen layer (so there is no seam between the two sections):
     - it opens as a circle from the globe's centre over the end of the problem track
       (p 0.88 -> 0.99, while the globe dives at the camera);
     - it stays behind the features section, which sits above it (z-index 1);
     - it is cut off at the bottom of the features section, so the page below is untouched.
   The rays turn slowly on their own and a little more with scroll. Static with reduced motion. */

import { useEffect, useMemo, useRef } from 'react';
import s from './swirl.module.css';

const ARMS = 30;                                    // a multiple of 3: bright, mid, dark
const SHADES = ['#EE1119', '#CC0B13', '#A1070E'];
const REVEAL: [number, number] = [0.88, 0.99];

/* one curved ray: out along one edge, back along the next */
function arm(k: number) {
  const w = (Math.PI * 2) / ARMS, a0 = k * w, R = 1.5, N = 28;
  const at = (r: number, a: number) => {
    const t = a + 1.75 * Math.pow(r, 0.72);        // the twist grows towards the rim
    return `${(Math.cos(t) * r).toFixed(4)} ${(Math.sin(t) * r).toFixed(4)}`;
  };
  const out: string[] = [], back: string[] = [];
  for (let i = 1; i <= N; i++) {
    const r = (i / N) * R;
    out.push(at(r, a0));
    back.unshift(at(r, a0 + w));
  }
  return `M0 0L${out.join('L')}L${back.join('L')}Z`;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export default function Swirl({ from, until }: { from: string; until: string }) {
  const clip = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const spin = useRef<SVGSVGElement>(null);
  const paths = useMemo(() => Array.from({ length: ARMS }, (_, k) => arm(k)), []);

  useEffect(() => {
    const track = document.querySelector<HTMLElement>(`${from} > div`);
    const globe = document.querySelector<HTMLElement>(`${from} [data-globe]`);
    const next = document.querySelector<HTMLElement>(until);
    const c = clip.current!, rv = reveal.current!, sp = spin.current!;
    if (!track || !next) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, shown = false;

    const frame = (now: number) => {
      raf = 0;
      const vh = innerHeight, vw = innerWidth;
      const tr = track.getBoundingClientRect();
      const p = clamp(-tr.top / Math.max(1, tr.height - vh));
      const open = smooth(clamp((p - REVEAL[0]) / (REVEAL[1] - REVEAL[0])));
      const bottom = next.getBoundingClientRect().bottom;
      const vis = open > 0 && bottom > 0;
      if (vis !== shown) { shown = vis; c.style.visibility = vis ? 'visible' : 'hidden'; }
      if (!vis) return;

      // the circle grows from the globe's centre until it covers the screen
      const g = globe?.getBoundingClientRect();
      const cx = g ? g.left + g.width / 2 : vw / 2, cy = g ? g.top + g.height / 2 : vh / 2;
      const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
      rv.style.clipPath = open >= 1 ? 'none' : `circle(${(open * far * 1.02).toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
      // and is cut off where the features section ends
      c.style.clipPath = `inset(0 0 ${Math.max(0, vh - bottom).toFixed(1)}px 0)`;
      const turn = still ? 0 : now / 1000 * 5 + scrollY * 0.035;
      sp.style.transform = `translate(-50%, -50%) rotate(${turn.toFixed(2)}deg) scale(${(1.25 - 0.25 * open).toFixed(3)})`;
      if (!still) raf = requestAnimationFrame(frame);   // keep turning while it's on screen
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    kick();
    addEventListener('scroll', kick, { passive: true });
    addEventListener('sg:scroll', kick);
    addEventListener('resize', kick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('scroll', kick);
      removeEventListener('sg:scroll', kick);
      removeEventListener('resize', kick);
    };
  }, [from, until]);

  return (
    <div className={s.clip} ref={clip} aria-hidden="true">
      <div className={s.reveal} ref={reveal}>
        <svg className={s.svg} ref={spin} viewBox="-1 -1 2 2" preserveAspectRatio="xMidYMid slice">
          <rect x="-1.6" y="-1.6" width="3.2" height="3.2" fill={SHADES[2]} />
          {paths.map((d, k) => <path key={k} d={d} fill={SHADES[k % 3]} />)}
          {/* a soft hot spot in the middle, like the reference */}
          <defs>
            <radialGradient id="swirl-core">
              <stop offset="0" stopColor="#FF2A33" stopOpacity=".55" />
              <stop offset="1" stopColor="#FF2A33" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r=".5" fill="url(#swirl-core)" />
        </svg>
      </div>
    </div>
  );
}
