/* Partners: one red card, bookending the hero, pinned to the screen for a few scrolls.
   While it's pinned, the line "Bring StemGrid to your ___" rolls its last word (school, academy,
   institute, university), holding each one; then the card lets go and the next section comes up.
   Real renders from the simulator float round it at different depths. Below the line: the ways to
   work together, and the call to action.
   All motion is CSS reading --p, which Scrub.tsx sets on the track (data-scrub="pin": 0..1 across
   the pinned stretch). No JavaScript of its own. */

import type { CSSProperties } from 'react';
import s from './partners.module.css';

const WORDS = ['school.', 'academy.', 'institute.', 'university.'];
const WAYS = [
  { h: 'Run a pilot', p: 'Try StemGrid with a few of your classes or batches and see how students take to it.' },
  { h: 'Build a course together', p: 'Shape lessons and projects around your syllabus, on the real kit’s modules.' },
  { h: 'Train your teachers', p: 'Workshops that get your teachers building and teaching with it confidently.' },
];
/* real renders from the simulator, and how each one floats: corner, depth, turn */
const FLOATS = [
  { img: 'cut-quark', cls: 'f1', d: 1.0, r: -14 },
  { img: 'cut-plug', cls: 'f2', d: 1.5, r: 18 },
  { img: 'cut-thermo', cls: 'f3', d: 0.8, r: 10 },
  { img: 'cut-build', cls: 'f4', d: 1.25, r: -10 },
] as const;

const v = (o: Record<string, string | number>) => o as CSSProperties;

export default function Partners({ contactUrl, phone }: { contactUrl: string; phone: { href: string; label: string } }) {
  return (
    <section className={s.partners} id="partners" aria-labelledby="partners-h">
      <div className={s.track} data-scrub="pin">
        <div className={s.pin}>
          <div className={s.card}>
            {FLOATS.map(f => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.img} className={`${s.float} ${s[f.cls]}`} style={v({ '--d': f.d, '--r': f.r })}
                src={`/assets/landing/${f.img}.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            ))}

            <h2 id="partners-h" className={s.h2}>
              <span className={s.lead}>Bring StemGrid to your</span>
              <span className={s.drum} aria-hidden="true">
                <span className={s.roll}>{WORDS.map(w => <span key={w}>{w}</span>)}</span>
              </span>
              <span className={s.srOnly}>school, academy, institute or university.</span>
            </h2>
            <p className={s.lede}>
              We’re partnering with schools, EdTech academies, training institutes and universities to put a real
              electronics kit on every student’s screen.
            </p>

            <ul className={s.ways}>
              {WAYS.map((w, i) => (
                <li key={w.h} style={v({ '--i': i })}><h3>{w.h}</h3><p>{w.p}</p></li>
              ))}
            </ul>

            <div className={s.ctaRow}>
              <a href={contactUrl} className={s.go}>Partner with us</a>
              <a href={phone.href} className={s.call}>Call {phone.label}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
