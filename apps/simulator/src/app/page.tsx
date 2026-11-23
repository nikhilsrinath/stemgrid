import Link from 'next/link';
import type { CSSProperties } from 'react';
import BuildDemo from '../landing/BuildDemo';
import Footer from '../landing/Footer';
import HeroGrid from '../landing/HeroGrid';
import NavAccount from '../landing/NavAccount';
import Scrub from '../landing/Scrub';
import SmoothScroll from '../landing/SmoothScroll';
import Waitlist from '../landing/Waitlist';
import s from './landing.module.css';

const Play = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
);

/* Schematic symbols drifting around the hero. Each one moves by its own amount as you
   scroll (dy px, dr deg), read by the .doodle rule in landing.module.css. */
const DOODLES: { d: string; vb: string; w: number; pos: CSSProperties; r0: number; dy: number; dr: number }[] = [
  { d: 'M2 20h18l6-14 12 28 12-28 12 28 12-28 6 14h18', vb: '0 0 100 40', w: 150, pos: { left: '4%', top: '19%' }, r0: -14, dy: 220, dr: -40 },          // resistor
  { d: 'M2 20c13-22 25-22 38 0s25 22 38 0 25-22 38 0', vb: '0 0 118 40', w: 160, pos: { right: '4%', top: '15%' }, r0: 10, dy: 300, dr: 30 },            // signal wave
  { d: 'M2 20h36M38 3v34M52 3v34M52 20h36', vb: '0 0 90 40', w: 110, pos: { left: '27%', top: '9%' }, r0: 22, dy: 200, dr: 70 },     // capacitor
  { d: 'M30 2v16M6 18h48M14 28h32M22 38h16', vb: '0 0 60 40', w: 80, pos: { right: '7%', bottom: '22%' }, r0: -8, dy: -240, dr: -50 },    // ground
  { d: 'M24 4a20 20 0 1 0 .01 0z', vb: '0 0 48 48', w: 60, pos: { right: '19%', top: '40%' }, r0: 0, dy: -320, dr: 0 },                   // pin hole
  { d: 'M2 22h22M24 6v32l26-16zM50 6v32M50 22h22M40 4l8-8M46-4h3v3', vb: '0 -8 74 50', w: 96, pos: { left: '17%', top: '44%' }, r0: -18, dy: -220, dr: 50 }, // LED
];

const v = (o: Record<string, string | number>) => o as CSSProperties;

/* The StemGrid services site (apps/web in this monorepo). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : 'https://stemgrid.in');

export default function Home() {
  return (
    <main className={s.page}>
      <SmoothScroll />
      <Scrub />

      {/* ---------- hero ---------- */}
      <header className={s.hero} data-scrub="out">
        <HeroGrid />
        <div className={s.doodles} aria-hidden="true">
          {DOODLES.map((o, i) => (
            <svg
              key={i} className={s.doodle} viewBox={o.vb} width={o.w}
              style={{ ...o.pos, ...v({ '--r0': `${o.r0}deg`, '--dy': `${o.dy}px`, '--dr': `${o.dr}deg` }) }}
            >
              <path d={o.d} />
            </svg>
          ))}
        </div>

        <nav className={s.nav}>
          <Link href="/" className={s.logo}>StemGrid<span className={s.beta}>Beta</span></Link>
          <div className={s.links}>
            <a href="#how">How it works</a>
            <a href="#partner">Partner</a>
            <a href="#mission">Mission</a>
            <a href={SITE_URL}>StemGrid ↗</a>
            <NavAccount />
          </div>
          <a href="#waitlist" className={s.navCta}>Join the waitlist</a>
        </nav>

        <div className={s.heroMain}>
          <div className={s.heroTop} data-hero-copy>
            <p className={s.badge}><i />Open beta, free for everyone</p>
            <h1 className={s.title}>
              <span className={s.r1}>Learn, build</span>{' '}
              <span className={s.r2}>and understand</span>{' '}
              <span className={s.r3}>electronics <em className={s.sticker}>from anywhere.</em></span>
            </h1>
          </div>

          <div className={s.heroFoot}>
            <div className={s.ctas}>
              <Link href="/simulator" className={s.run} data-hero-cta><Play />Start building</Link>
              <a href="#how" className={s.ghostBtn}>Watch a build</a>
            </div>
            <ul className={s.facts}>
              <li><b>No download</b><span>It runs in your browser.</span></li>
              <li><b>No sign-up</b><span>Open it and start building.</span></li>
              <li><b>Nothing to break</b><span>Get it wrong, run it again.</span></li>
            </ul>
          </div>
        </div>
      </header>

      {/* ---------- scroll-scrubbed build ---------- */}
      <BuildDemo />

      {/* ---------- technical partner ---------- */}
      <section className={s.partner} id="partner" data-scrub>
        <div className={`${s.wrap} ${s.partnerIn}`}>
          <div className={s.partnerArt}>
            <p className={s.stack} aria-hidden="true"><span>Tech</span><span>partner</span></p>
            <figure className={s.logoCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/qbitio-logo.png" alt="Qbitio" width={1012} height={248} />
              <figcaption>Technical partner</figcaption>
            </figure>
          </div>
          <div className={s.partnerText}>
            <h2 className={s.h2}>Built with Qbitio.</h2>
            <p>
              Qbitio is StemGrid’s technical partner, and their boards are built into the simulator. Pick one,
              plug modules into it and program it, right here in your browser.
            </p>
            <p>
              You learn on real board designs instead of made-up stand-ins, so what you figure out here makes
              sense when you hold the real thing.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- mission: the rows light up like LEDs as you scroll ---------- */}
      <section className={s.mission} id="mission">
        <div className={s.missionTrack} data-scrub="pin">
          <div className={s.missionPin}>
            <h2 className={s.missionH}>Our mission</h2>
            <p className={s.rows} aria-label="Anyone can build anything.">
              <span style={v({ '--i': 0 })} aria-hidden="true">Anyone</span>
              <span style={v({ '--i': 1 })} aria-hidden="true">can build</span>
              <span style={v({ '--i': 2 })} aria-hidden="true">anything.</span>
            </p>
            <p className={s.missionP}>
              Electronics shouldn’t need a lab, a box of parts and a teacher in the same room. We’re putting a
              real plug-and-play kit in the browser, so anyone, anywhere, can learn it by building it.
            </p>
          </div>
        </div>
        <div className={`${s.wrap} ${s.pillars}`}>
          <div><h3>Learn by building</h3><p>You understand a circuit best when you’ve made it work, then changed it to see what happens.</p></div>
          <div><h3>Open to everyone</h3><p>A school laptop, a home computer or a library PC is all it takes.</p></div>
          <div><h3>Skills that carry over</h3><p>The parts behave like the real kit, so your code and know-how come with you.</p></div>
        </div>
      </section>

      {/* ---------- waitlist ---------- */}
      <section className={s.waitlist} id="waitlist" data-scrub>
        <div className={s.pattern} aria-hidden="true" />
        <div className={s.wlCard}>
          <h2 className={s.h2}>Join the waitlist</h2>
          <p className={s.wlP}>
            The beta is open to everyone today. Join the waitlist and we’ll email you first when the full
            version launches.
          </p>
          <Waitlist />
          <p className={s.wlAlt}>Can’t wait? <Link href="/simulator">Open the simulator</Link> and start building now.</p>
        </div>
      </section>

      <Footer siteUrl={SITE_URL} />
    </main>
  );
}
