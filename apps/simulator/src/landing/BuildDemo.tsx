'use client';

/* The real simulator (/simulator?demo) in an iframe, scrubbed by scroll. The engine's demo
   driver (window.__sgDemo, see DEMO DRIVER in src/simulator/engine.js) builds and undoes the
   scene to match the scroll progress p, and tells us where to draw the pointer. */

import { useEffect, useRef, useState } from 'react';
import s from './demo.module.css';

const W = 1280, H = 800; // the iframe's own size; scaled to fit

type Frame = { pointer: [number, number]; held: boolean; click: number | null; card: { name: string; img: string } | null };
type Demo = { set: (p: number) => Frame };

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
  const [k, setK] = useState(0.5);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  /* scale the 1280×800 iframe to fit */
  useEffect(() => {
    const el = fit.current; if (!el) return;
    const ro = new ResizeObserver(() => setK(Math.min(el.clientWidth / W, el.clientHeight / H)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* scroll → p → drive the simulator every frame while the section is on screen */
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = -1, raf = 0, on = false, lastStep = -1, lastDone = false;
    const target = () => {
      const r = sec.current!.getBoundingClientRect();
      return clamp(-r.top / Math.max(1, r.height - innerHeight));
    };
    const loop = () => {
      raf = on ? requestAnimationFrame(loop) : 0;
      const t = target();
      cur = cur < 0 || reduce ? t : cur + (t - cur) * 0.12;
      if (Math.abs(t - cur) < 0.0002) cur = t;
      if (bar.current) bar.current.style.transform = `scaleX(${cur})`;
      let st = 0; STEP_AT.forEach((a, i) => { if (cur >= a) st = i; });
      if (st !== lastStep) { lastStep = st; setStep(st); }
      const d = cur >= DONE_AT; if (d !== lastDone) { lastDone = d; setDone(d); }

      const demo = (frame.current?.contentWindow as (Window & { __sgDemo?: Demo }) | null)?.__sgDemo;
      if (!demo) return;
      setReady(true);
      const f = demo.set(cur);
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
      if (on && !raf) raf = requestAnimationFrame(loop);
    }, { rootMargin: '200px' });
    io.observe(sec.current!);
    return () => { io.disconnect(); cancelAnimationFrame(raf); on = false; };
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
          <div className={s.frame} style={{ width: W * k, height: H * k }}>
            <div className={s.stage} style={{ transform: `scale(${k})` }}>
              <iframe ref={frame} src="/simulator?demo" title="StemGrid simulator, building a parking sensor" tabIndex={-1} />
              <div className={s.card} ref={card} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/modules/module-01_quark-c3-controller.png" alt="" /><b />
              </div>
              <div className={s.cursor} ref={cursor} aria-hidden="true">
                <i ref={ring} className={s.ring} />
                <svg width="58" height="66" viewBox="0 0 26 30"><path d="M3 2 L3 24 L9 18.5 L13 27 L17 25 L13 17 L21 17 Z" fill="#fff" stroke="#111" strokeWidth="2.2" strokeLinejoin="round" /></svg>
              </div>
            </div>
            {!ready && <div className={s.loading}>Starting the simulator…</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
