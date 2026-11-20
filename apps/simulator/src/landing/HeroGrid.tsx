'use client';

/* The hero background: the base plate's hole grid, drawn on a canvas. Holes light up like
   LEDs around the pointer and leave a short trail; a ripple runs out from the main button
   when the page loads, and another from wherever you tap. Holes behind the headline stay
   dim so the text keeps its contrast. Static grid when reduced motion is on. */

import { useEffect, useRef } from 'react';

const GAP = 28, R = 7.5;
const DEEP: [number, number, number] = [201, 13, 22];     // unlit hole: #B30912 at 55% over the red, same as the CSS fallback
const HOT: [number, number, number] = [255, 128, 68];     // #FF8044, module orange
const CREAM: [number, number, number] = [255, 242, 223];  // #FFF2DF

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const colour = (l: number) => {
  const c = l < 0.5 ? mix(DEEP, HOT, l * 2) : mix(HOT, CREAM, (l - 0.5) * 2);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export default function HeroGrid() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!, host = cv.parentElement!, ctx = cv.getContext('2d')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, cols = 0, rows = 0, lit = new Float32Array(0), dim = new Float32Array(0);
    let px = -1e4, py = -1e4, active = false, raf = 0, visible = true;
    const ripples: { x: number; y: number; t0: number }[] = [];

    const layout = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
      lit = new Float32Array(cols * rows);
      // holes behind the text block glow less
      dim = new Float32Array(cols * rows).fill(1);
      const hr = host.getBoundingClientRect(), copy = host.querySelector('[data-hero-copy]')?.getBoundingClientRect();
      if (copy) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * GAP + GAP / 2 + hr.left, y = j * GAP + GAP / 2 + hr.top;
        if (x > copy.left - 10 && x < copy.right + 10 && y > copy.top - 10 && y < copy.bottom + 10) dim[j * cols + i] = 0.45;
      }
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      let any = false;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, x = i * GAP + GAP / 2, y = j * GAP + GAP / 2;
        let target = 0;
        if (active) { const d = Math.hypot(x - px, y - py); if (d < 150) target = (1 - d / 150) ** 1.6; }
        for (const r of ripples) {
          const rad = (now - r.t0) * 0.75, d = Math.abs(Math.hypot(x - r.x, y - r.y) - rad);
          if (d < 46) target = Math.max(target, (1 - d / 46) * Math.max(0, 1 - rad / 1400));
        }
        const v = lit[k] = Math.max(lit[k] * 0.93, target) ;
        const l = v * dim[k];
        if (l > 0.01) any = true;
        ctx.fillStyle = colour(l);
        ctx.beginPath(); ctx.arc(x, y, R + l * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      for (let n = ripples.length - 1; n >= 0; n--) if ((now - ripples[n].t0) * 0.75 > 1400 + 60) ripples.splice(n, 1);
      return any || ripples.length > 0 || active;
    };

    const loop = (now: number) => {
      const busy = draw(now);
      raf = busy && visible ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if (!raf && visible && !still) raf = requestAnimationFrame(loop); };
    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    const onMove = (e: PointerEvent) => { [px, py] = local(e); active = true; wake(); };
    const onLeave = () => { active = false; };
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest('a, button')) return;
      const [x, y] = local(e); ripples.push({ x, y, t0: performance.now() }); wake();
    };

    layout(); draw(performance.now());
    const ro = new ResizeObserver(() => { layout(); draw(performance.now()); });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); });
    io.observe(host);

    let t: ReturnType<typeof setTimeout> | undefined;
    if (!still) {
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerleave', onLeave);
      host.addEventListener('pointerdown', onDown);
      // the one load moment: a ripple from the main button
      t = setTimeout(() => {
        const cta = host.querySelector('[data-hero-cta]')?.getBoundingClientRect(), r = cv.getBoundingClientRect();
        if (cta) { ripples.push({ x: cta.left + cta.width / 2 - r.left, y: cta.top + cta.height / 2 - r.top, t0: performance.now() }); wake(); }
      }, 650);
    }
    return () => {
      clearTimeout(t); cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}
