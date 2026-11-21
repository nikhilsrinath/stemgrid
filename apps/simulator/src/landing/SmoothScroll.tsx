'use client';

/* Inertial smooth scrolling for the landing page (no dependency).
   - Mouse wheels and trackpads: the wheel sets a target and the page eases towards it every
     frame, so notched Windows wheels glide instead of jumping 100px at a time.
   - In-page links (#how, #waitlist…) and smoothTo() run a timed ease to the target.
   - Anything else that scrolls the page (scrollbar drag, keys, find-in-page, touch) is left
     native; we just follow it.
   After every frame it scrolls, it fires 'sg:scroll' so Scrub.tsx can update --p in the same
   frame (the native scroll event would arrive one frame late and the effects would trail).
   Opt an element out with data-native-scroll. Off with reduced motion. */

import { useEffect } from 'react';

let api: { to: (y: number) => void } | null = null;

export function smoothTo(y: number) {
  if (api) api.to(y);
  else scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// Tuned to match the marketing site (apps/web motion.ts: Lenis lerp 0.09, wheelMultiplier 0.9,
// 1.6s anchor scrolls) so both pages share the same slow, gliding feel.
const RATE = 0.09 * 60;      // per-second catch-up rate, equivalent to Lenis lerp 0.09 at 60fps
const WHEEL_MULT = 0.9;      // distance per wheel notch
const ANCHOR_MS = 1600;      // duration of in-page link scrolls
const ANCHOR_OFFSET = -20;   // land slightly above the section, like the main site
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export default function SmoothScroll() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let target = scrollY, cur = scrollY, raf = 0, last = 0;
    let tween: { from: number; to: number; t0: number; dur: number } | null = null;

    const clampY = (y: number) => Math.min(root.scrollHeight - innerHeight, Math.max(0, y));

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      if (tween) {
        const u = Math.min(1, (now - tween.t0) / tween.dur);
        cur = target = tween.from + (tween.to - tween.from) * easeOutExpo(u);
        if (u >= 1) tween = null;
      } else {
        cur += (target - cur) * (1 - Math.exp(-dt * RATE));
        if (Math.abs(target - cur) < 0.25) cur = target;
      }
      scrollTo(0, cur);
      dispatchEvent(new Event('sg:scroll'));
      if (cur !== target || tween) raf = requestAnimationFrame(frame);
      else { raf = 0; last = 0; }
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; tween = null; };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;                    // pinch / ctrl+wheel zoom
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;            // sideways swipes
      if ((e.target as Element | null)?.closest?.('[data-native-scroll]')) return;
      e.preventDefault();
      if (tween) { tween = null; target = cur; }
      if (!raf) cur = target = scrollY;
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
      target = clampY(target + e.deltaY * unit * WHEEL_MULT);
      start();
    };

    // something else moved the page (scrollbar, keys, touch, find): follow it, don't fight it
    const onScroll = () => {
      if (Math.abs(scrollY - cur) > 2) { stop(); cur = target = scrollY; }
    };

    const to = (y: number) => {
      const from = scrollY, dest = clampY(y), dist = Math.abs(dest - from);
      if (dist < 1) return;
      stop();
      cur = target = from;
      tween = { from, to: dest, t0: performance.now(), dur: ANCHOR_MS };
      start();
    };
    api = { to };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const id = a?.getAttribute('href')!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      to(el.getBoundingClientRect().top + scrollY + ANCHOR_OFFSET);
      history.pushState(null, '', `#${id}`);
    };

    const onResize = () => { target = clampY(target); };

    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('click', onClick);
    return () => {
      stop();
      api = null;
      removeEventListener('wheel', onWheel);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return null;
}
