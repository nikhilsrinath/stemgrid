'use client';

/* The real simulator (/simulator?demo) in an iframe, scrubbed by scroll. The engine's demo
   driver (window.__sgDemo, see DEMO DRIVER in src/simulator/engine.js) builds and undoes the
   scene to match the scroll progress p, and tells us where to draw the pointer. */

import { useEffect, useRef, useState } from 'react';
import s from './demo.module.css';

const W = 1280, H = 800; // the iframe's own size; scaled to fit

type Frame = { pointer: [number, number]; held: boolean; click: number | null; card: { name: string; img: string } | null };
type Demo = { set: (p: number) => Frame; sound?: (on: boolean) => void };

const STEPS: [string, string][] = [
  ['Drag modules onto the plate', 'Pick the Quark C3 brain, a sensor and a buzzer from the parts library. Each one snaps to the hole grid, like on the real plate.'],
  ['Plug in Zap cables', 'One keyed cable per module. It only fits one way round, so you can’t wire it wrong.'],
  ['Write a few lines of Python', 'Plain words like distance(), led.color() and buzzer.beep(). No drivers, no setup, no pin numbers.'],
  ['Press Run and test it', 'Your code runs on the virtual Quark. Lower the block towards the sensor: the light turns orange, then red, and the buzzer beeps.'],
];
const STEP_AT = [0, 0.5, 0.735, 0.885];
const DONE_AT = 0.985;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export default function BuildDemo() {
  const sec = useRef<HTMLElement>(null);
  const fit = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  /* k: the iframe's scale. box: the window it shows through. On desktop the whole simulator fits
     (box = W×H scaled). Stacked (phones/tablets) it fills the slot's height instead, and the window
     shows only part of its width, panning to follow the pointer like a camera operator. */
  const [k, setK] = useState(0.5);
  const [box, setBox] = useState<[number, number]>([W * 0.5, H * 0.5]);
  const view = useRef({ k: 0.5, w: W * 0.5, stacked: false });
  const panX = useRef(0);   // stacked only: how far the iframe is slid left, in screen px
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  /* scale the 1280×800 iframe: fit it whole on desktop, fill the height when stacked */
  useEffect(() => {
    const el = fit.current; if (!el) return;
    const mq = matchMedia('(max-width: 990px)');
    const size = () => {
      const cw = el.clientWidth, ch = el.clientHeight;
      if (!cw || !ch) return;
      const stacked = mq.matches;
      const kk = stacked ? Math.max(ch / H, cw / W) : Math.min(cw / W, ch / H);
      const bw = stacked ? cw : W * kk, bh = stacked ? ch : H * kk;
      view.current = { k: kk, w: bw, stacked };
      setK(kk); setBox([bw, bh]);
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    mq.addEventListener('change', size);
    return () => { ro.disconnect(); mq.removeEventListener('change', size); };
  }, []);

  /* scroll → p → drive the simulator every frame while the section is on screen */
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = -1, raf = 0, on = false, lastStep = -1, lastDone = false, lastT = 0, isReady = false;
    let panned = false;
    const place = (px: number | null, dt: number, edge = false) => {
      const { k: kk, w, stacked } = view.current, st = stage.current;
      if (!st) return;
      let x = 0;
      if (stacked) {
        // keep the pointer a little left of centre; with no pointer, frame the plate. While the code
        // is written, hold the right edge so the whole editor (and its Run button) stays in view
        const want = edge ? w - W * kk : Math.min(0, Math.max(w - W * kk, w * 0.46 - (px ?? W * 0.6) * kk));
        x = !panned || reduce ? want : panX.current + (want - panX.current) * (1 - Math.exp(-dt * 5));
        panned = true;
      }
      panX.current = x;
      st.style.transform = `translate(${x.toFixed(1)}px, 0) scale(${kk})`;
    };
    const target = () => {
      const r = sec.current!.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight));
    };
    const loop = (now: number) => {
      raf = on ? requestAnimationFrame(loop) : 0;
      // light, frame-rate independent catch-up: SmoothScroll already eases wheel scrolling,
      // this only softens jumps (keys, scrollbar, touch flicks) without stacking lag
      const dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
      lastT = now;
      const t = target();
      cur = cur < 0 || reduce ? t : cur + (t - cur) * (1 - Math.exp(-dt * 16));
      if (Math.abs(t - cur) < 0.0002) cur = t;
      if (bar.current) bar.current.style.transform = `scaleX(${cur})`;
      let st = 0; STEP_AT.forEach((a, i) => { if (cur >= a) st = i; });
      if (st !== lastStep) { lastStep = st; setStep(st); }
      const d = cur >= DONE_AT; if (d !== lastDone) { lastDone = d; setDone(d); }

      const demo = (frame.current?.contentWindow as (Window & { __sgDemo?: Demo }) | null)?.__sgDemo;
      if (!demo) { place(null, dt); return; }
      if (!isReady) { isReady = true; setReady(true); }
      const f = demo.set(cur);
      place(cur < 0.01 || d ? null : f.pointer[0], dt, st === 2);
      const c = cursor.current;
      if (c) {
        c.style.transform = `translate(${f.pointer[0]}px, ${f.pointer[1]}px)`;
        c.style.opacity = cur < 0.01 || d ? '0' : '1';
        c.classList.toggle(s.down, f.held);
      }
      if (ring.current) {
        ring.current.style.opacity = f.click == null ? '0' : String(1 - f.click);
        ring.current.style.transform = `scale(${f.click == null ? 0.4 : 0.4 + f.click})`;
      }
      const cd = card.current;
      if (cd) {
        cd.style.opacity = f.card ? '1' : '0';
        cd.style.transform = `translate(${f.pointer[0]}px, ${f.pointer[1]}px) translate(-30px, -50px) rotate(-3deg) scale(1.6)`;
        if (f.card) {
          const img = cd.querySelector('img')!, b = cd.querySelector('b')!;
          if (img.getAttribute('src') !== f.card.img) img.setAttribute('src', f.card.img);
          b.textContent = f.card.name;
        }
      }
    };
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !raf) { lastT = 0; raf = requestAnimationFrame(loop); }
    }, { rootMargin: '200px' });
    io.observe(sec.current!);

    /* sound only while the section is actually on screen: once the build is done, the buzzer
       beeps whenever the block is near the sensor, and it must stop when you scroll past */
    let seen = false;
    const demoOf = () => (frame.current?.contentWindow as (Window & { __sgDemo?: Demo }) | null)?.__sgDemo;
    const hear = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      demoOf()?.sound?.(seen);
    });
    hear.observe(sec.current!);
    // the demo may only come up after the first check, so tell it once it's ready
    const onLoad = () => demoOf()?.sound?.(seen);
    const fr = frame.current;
    fr?.addEventListener('load', onLoad);
    const ready = setInterval(() => { if (demoOf()) { demoOf()!.sound?.(seen); clearInterval(ready); } }, 500);

    return () => {
      io.disconnect(); hear.disconnect(); clearInterval(ready); fr?.removeEventListener('load', onLoad);
      demoOf()?.sound?.(false);
      cancelAnimationFrame(raf); on = false;
    };
  }, []);

  return (
    <section ref={sec} className={s.sec} id="how" aria-label="How a build works, step by step">
      <div className={s.sticky}>
        <div className={s.copy}>
          <h2 className={s.h2}>This is what building feels like.</h2>
          <ol className={s.steps}>
            {STEPS.map(([t, d], i) => (
              <li key={t} className={i === step ? s.on : i < step ? s.past : undefined}>
                <span className={s.n}>{i + 1}</span>
                <div><b>{t}</b><p>{d}</p></div>
              </li>
            ))}
          </ol>
          <div className={s.rail} aria-hidden="true"><i ref={bar} /></div>
          <p className={`${s.done} ${done ? s.doneOn : ''}`}>That’s it. You just built a parking sensor.</p>
        </div>

        <div className={s.fit} ref={fit}>
          <div className={s.frame} style={{ width: box[0], height: box[1] }}>
            <div className={s.stage} ref={stage} style={{ transform: `translate(${panX.current}px, 0) scale(${k})` }}>
              <iframe ref={frame} src="/simulator?demo" title="StemGrid simulator, building a parking sensor" tabIndex={-1} />
              <div className={s.card} ref={card} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/modules/module-01_quark-c3-controller.png" alt="" /><b />
              </div>
              <div className={s.cursor} ref={cursor} aria-hidden="true">
                <i ref={ring} className={s.ring} />
                <svg width="58" height="66" viewBox="0 0 26 30"><path d="M3 2 L3 24 L9 18.5 L13 27 L17 25 L13 17 L21 17 Z" fill="#fff" stroke="#17171C" strokeWidth="2.2" strokeLinejoin="round" /></svg>
              </div>
            </div>
            {!ready && <div className={s.loading}>Starting the simulator…</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
