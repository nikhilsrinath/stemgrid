'use client';

/* StemGrid Membership: the page's finale, one pinned scene scrubbed by scroll (p 0..1).
     1. the page goes dark, and gold dust rises out of it;
     2. a brushed-gold membership card climbs from the bottom of the screen, standing up out of a
        flat tilt into 3D, with rays of gold light turning behind it and a sheen across the metal;
     3. the card glides aside, the offer comes up in gold, and the member advantages light up
        one by one;
     4. the call to action comes in, then the section lets go.
   The dust is a 2D canvas (additive glow sprites); the card is CSS 3D, so its type stays sharp.
   JS sets a handful of CSS variables on the stage each frame; membership.module.css does the
   rest. Reduced motion shows the finished scene with still dust.
   The offer follows StemGrid_Membership.pdf (20 places: Founding Partners, then Charter Members).
   It talks about advantages only: never put prices, the price lock or discounts here. */

import { useEffect, useRef } from 'react';
import s from './membership.module.css';

const PERKS = [
  { h: 'Unlimited students to start', p: 'Unlimited student logins for your first months.' },
  { h: 'Every new feature included', p: 'Lessons, guided projects and teacher tools, as they launch.' },
  { h: 'Onboarding and training', p: 'We set your institute up and train your teachers.' },
  { h: 'Listed on stemgrid.in', p: 'Parents looking for courses find you on our Partner page.' },
  { h: 'Badge, plaque, certificates', p: 'A member plaque, and certificates with your logo.' },
  { h: 'Priority support', p: 'Replies within one working day, on WhatsApp or email.' },
];

/* the timeline, in p */
const T = {
  dark: [0, 0.1], dust: [0.03, 0.2], rise: [0.1, 0.38], side: [0.42, 0.56], title: [0.47, 0.56],
  perk0: 0.55, perkGap: 0.045, perkLen: 0.06, cta: [0.86, 0.93],
} as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const span = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* the light page colour (#F3F3F5) to near-black */
const darken = (t: number) => {
  const a = [243, 243, 245], b = [9, 8, 7];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
};

type Mote = { x: number; y: number; z: number; r: number; tw: number; sp: number; hue: number };

export default function Membership({ contactUrl }: { contactUrl: string }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const perks = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const tr = track.current!, st = stage.current!, c = cv.current!;
    const ctx = c.getContext('2d')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = -1, raf = 0, on = false, last = 0, W = 0, H = 0, dpr = 1;

    /* gold dust: a pre-drawn glow sprite per tint, stamped with additive blending */
    const TINTS = ['255 214 130', '245 185 66', '255 241 196', '214 150 40'];
    const sprites = TINTS.map(rgb => {
      const g = document.createElement('canvas'); g.width = g.height = 64;
      const x = g.getContext('2d')!, rg = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, `rgb(${rgb} / 1)`); rg.addColorStop(0.18, `rgb(${rgb} / .85)`);
      rg.addColorStop(0.45, `rgb(${rgb} / .18)`); rg.addColorStop(1, `rgb(${rgb} / 0)`);
      x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
      return g;
    });
    let motes: Mote[] = [];
    const seed = () => {
      const n = Math.round(Math.min(900, (W * H) / 1700));
      motes = Array.from({ length: n }, () => ({
        x: Math.random(), y: Math.random(), z: Math.pow(Math.random(), 1.8),     // most far, a few close
        r: 0.6 + Math.random() * 1.6, tw: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.8,
        hue: Math.floor(Math.random() * sprites.length),
      }));
    };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = st.clientWidth; H = st.clientHeight;
      c.width = W * dpr; c.height = H * dpr;
      seed();
    };
    const ro = new ResizeObserver(size);
    ro.observe(st);
    size();

    const dust = (p: number, t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const amt = smooth(span(p, T.dust));
      if (amt <= 0) return;
      ctx.globalCompositeOperation = 'lighter';
      const n = Math.round(motes.length * (0.35 + 0.65 * amt));
      for (let i = 0; i < n; i++) {
        const m = motes[i];
        const depth = 0.25 + m.z * 1.5;
        // rises with the scroll (closer motes faster), plus a slow drift of its own
        let y = (m.y - p * 2.4 * depth * m.sp - t * 0.012 * depth) % 1;
        if (y < 0) y += 1;
        const x = m.x + Math.sin(t * 0.3 + m.tw) * 0.004 * depth;
        const tw = 0.55 + 0.45 * Math.sin(t * 2.2 * m.sp + m.tw);
        const r = m.r * depth * (m.z > 0.85 ? 3.2 : 1) * 4;                   // a few big, soft, close ones
        ctx.globalAlpha = amt * tw * (m.z > 0.85 ? 0.35 : 0.9);
        ctx.drawImage(sprites[m.hue], x * W - r, y * (H + 40) - 20 - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const paint = (p: number, t: number) => {
      const set = (k: string, v: number) => st.style.setProperty(k, v.toFixed(4));
      st.style.setProperty('--bg', darken(smooth(span(p, T.dark))));
      set('--rise', easeOut(span(p, T.rise)));
      set('--side', smooth(span(p, T.side)));
      set('--title', easeOut(span(p, T.title)));
      const cta = easeOut(span(p, T.cta));
      set('--cta', cta);
      st.toggleAttribute('data-cta', cta > 0.01);             // the button can't be tabbed to before it shows
      set('--p', p);
      set('--float', still ? 0 : Math.sin(t * 0.9));
      perks.current.forEach((el, k) => {
        if (!el) return;
        const a = T.perk0 + k * T.perkGap;
        el.style.setProperty('--v', easeOut(clamp((p - a) / T.perkLen)).toFixed(4));
      });
      dust(p, t);
    };

    const target = () => { if (still) return 1; const r = tr.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
    const loop = (now: number) => {
      raf = on ? requestAnimationFrame(loop) : 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const goal = target();
      cur = cur < 0 ? goal : cur + (goal - cur) * (1 - Math.exp(-dt * 12));
      if (Math.abs(goal - cur) < 0.0002) cur = goal;
      paint(cur, still ? 0 : now / 1000);
    };
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      if (on && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    }, { rootMargin: '200px 0px' });
    io.observe(tr);
    paint(target(), 0);
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className={s.membership} id="membership" aria-labelledby="membership-h">
      <div className={s.track} ref={track}>
        <div className={s.stage} ref={stage}>
          <div className={s.rays} aria-hidden="true" />
          <canvas className={s.dust} ref={cv} aria-hidden="true" />

          {/* the card */}
          <div className={s.cardWrap} aria-hidden="true">
            <div className={s.card}>
              <div className={s.face}>
                <span className={s.side}>StemGrid <b>Membership</b></span>
                <span className={s.emblem}><i /><i /><i /><i /></span>
                <div className={s.holder}>
                  <b>Your institute</b>
                  <small>Founding Partner</small>
                </div>
              </div>
              <div className={s.sheen} />
            </div>
          </div>

          {/* the offer */}
          <div className={s.copy}>
            <h2 id="membership-h" className={s.h2}>Become a StemGrid Member</h2>
            <p className={s.lede}>
              <b>Only 20 places. Ever.</b> Join the academies, institutes, schools and colleges building the future
              of electronics education with us.
            </p>
            <ul className={s.perks}>
              {PERKS.map((k, i) => (
                <li key={k.h} ref={el => { perks.current[i] = el; }}>
                  <h3>{k.h}</h3>
                  <p>{k.p}</p>
                </li>
              ))}
            </ul>
            <p className={s.founding}>
              The first 10 join as <b>Founding Partners</b> and get a seat on the Partner Council, voting on what we
              build next. The next 10 join as <b>Charter Members</b>.
            </p>
            <a href={contactUrl} className={s.cta}>Claim your place</a>
          </div>
        </div>
      </div>
    </section>
  );
}
