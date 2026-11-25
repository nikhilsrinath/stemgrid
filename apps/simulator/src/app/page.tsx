import Link from 'next/link';
import BrandLogo from '@/ui/BrandLogo';
import type { CSSProperties } from 'react';
import BuildDemo from '../landing/BuildDemo';
import Footer from '../landing/Footer';
import Membership from '../landing/Membership';
import Partners from '../landing/Partners';
import HeroGrid from '../landing/HeroGrid';
import NavAccount from '../landing/NavAccount';
import Problem from '../landing/Problem';
import Swirl from '../landing/Swirl';
import Scrub from '../landing/Scrub';
import SmoothScroll from '../landing/SmoothScroll';
import s from './landing.module.css';
import { appHref } from '@/lib/hosts';

const Play = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>
);

const v = (o: Record<string, string | number>) => o as CSSProperties;

/* The Lab on Wheels services site (apps/web in this monorepo). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : 'https://lab.stemgrid.in');

/* Renders from the simulator itself (public/assets/landing), captured from real builds. */
const IMG = '/assets/landing/';

/* A transparent render of simulator objects (cut-*.webp), sized to fit its box. */
function Cut({ img, alt }: { img: string; alt: string }) {
  return (
    <div className={s.cut}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${IMG}cut-${img}.webp`} alt={alt} loading="lazy" decoding="async" />
    </div>
  );
}

export default function Home() {
  return (
    <main className={s.page} id="top">
      <SmoothScroll />
      <Scrub />

      {/* ---------- nav ---------- */}
      <nav className={s.nav}>
        <Link href="/" className={s.logo}>
          <BrandLogo height={38} /><span className={s.beta}>Beta</span>
        </Link>
        <div className={s.links}>
          <a href="#features">Features</a>
          <a href="#how">Watch a build</a>
          <a href="#mission">Mission</a>
          <a href={SITE_URL}>Lab on Wheels</a>
        </div>
        <div className={s.navEnd}>
          <NavAccount className={s.navGhost} />
          <Link href={appHref('/simulator')} className={s.navCta}>Start building</Link>
        </div>
      </nav>

      {/* ---------- hero: a quiet red card, headline and two buttons ---------- */}
      <header className={s.heroWrap}>
        <div className={s.hero}>
          <HeroGrid />
          <Link href={appHref('/simulator')} className={s.tab}><i aria-hidden="true" />Open beta, free for everyone</Link>

          <div className={s.heroCopy} data-hero-copy>
            <h1 className={s.title}>
              Build real electronics, right in your <span className={s.sticker}>browser</span>
            </h1>
            <p className={s.lede}>
              The real feel of building electronics, open to everyone. Snap modules onto a plate, plug in the
              cables and code it in Python, right in your browser, with no parts to buy and nothing that can burn out.
            </p>
            <div className={s.dock}>
              <Link href={appHref('/simulator')} className={s.run} data-hero-cta><Play />Start building</Link>
              <a href="#how" className={s.soft}>Watch a build</a>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- the problem: a plate-hole globe, scrubbed by scroll ---------- */}
      <Problem />
      <Swirl from="#problem" until="#features" />

      {/* ---------- features: four main ones, each shown by a cut-out render from the simulator ---------- */}
      <section className={s.features} id="features" aria-labelledby="feat-h">
        <div className={s.featHead}>
          <h2 id="feat-h" className={s.h2}>Everything the real kit does, on your screen.</h2>
          <p>Every object here is a render from the simulator. Same modules, same cables, same code as the real kit.</p>
        </div>

        <div className={s.bento}>
          <article className={`${s.card} ${s.cA}`}>
            <Cut img="build" alt="A build with the Quark controller, ultrasonic sensor, OLED, servo and buzzer, all wired up" />
            <div className={s.copy}>
              <h3>Real-time 3D</h3>
              <p>Orbit, zoom and pan around your build. Every module is modelled on the real part, down to the pins.</p>
              <ul className={s.keys} aria-label="Controls">
                <li><kbd>Drag</kbd> orbit</li>
                <li><kbd>Scroll</kbd> zoom</li>
                <li><kbd>Right-drag</kbd> pan</li>
              </ul>
            </div>
          </article>

          <article className={`${s.card} ${s.cB}`}>
            <div className={s.copy}>
              <h3>Live simulation</h3>
              <p>Parts behave like the real ones. The DHT11 reads the room, the Quark sends it on, and the OLED shows 31 °C.</p>
            </div>
            <Cut img="thermo" alt="A DHT11 sensor sending 31 °C to the OLED display through the Quark" />
          </article>

          <article className={`${s.card} ${s.cC}`}>
            <Cut img="plug" alt="A buzzer module with a keyed Zap cable plugged in" />
            <div className={s.copy}>
              <h3>Plug-n-play electronics</h3>
              <p>One keyed Zap cable per module. It only fits one way, so there’s no breadboard and no wrong wiring.</p>
            </div>
          </article>

          <article className={`${s.card} ${s.cD}`}>
            <div className={s.art}>
              <Cut img="quark" alt="The Quark C3 controller with its light glowing red" />
              <pre className={s.snip} aria-hidden="true"><code>
                <i>d</i> = <b>distance</b>(){'\n'}
                <em>if</em> d {'<'} <u>10</u>:{'\n'}
                {'    '}led.<b>color</b>(<s>&quot;red&quot;</s>)
              </code></pre>
            </div>
            <div className={s.copy}>
              <h3>Code in simple Python</h3>
              <p>Plain words, not pin numbers. Press Run and the Quark’s light turns red.</p>
            </div>
          </article>
        </div>
      </section>

      {/* ---------- scroll-scrubbed build ---------- */}
      <BuildDemo />

      {/* ---------- mission: the rows light up as you scroll ---------- */}
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
        <div className={s.pillars}>
          <div><h3>Learn by building</h3><p>You understand a circuit best when you’ve made it work, then changed it to see what happens.</p></div>
          <div><h3>Open to everyone</h3><p>A school laptop, a home computer or a library PC is all it takes.</p></div>
          <div><h3>Skills that carry over</h3><p>The parts behave like the real kit, so your code and know-how come with you.</p></div>
        </div>
      </section>

      {/* ---------- partners: modules wired to the board as you scroll ---------- */}
      <Partners contactUrl={`${SITE_URL}/#contact`} phone={{ href: 'tel:+918925172636', label: '+91 89251 72636' }} />

      {/* ---------- membership: the page goes dark, gold dust, a card rises ---------- */}
      <Membership contactUrl={`${SITE_URL}/#contact`} />

      <Footer siteUrl={SITE_URL} />
    </main>
  );
}
