import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { toViewer } from '@/lib/viewer';
import AppNav from '@/ui/AppNav';
import s from '@/ui/ui.module.css';
import Explorer from './Explorer';
import { PARTS } from './parts';
import c from './course.module.css';

export const metadata: Metadata = { title: 'Course · StemGrid' };

const MOVES = [
  { k: 'Meet', text: 'What the part is, what it senses or does, and what happens inside it.' },
  { k: 'Wire', text: 'Snap it onto the plate and plug in the Zap connector, the right way round.' },
  { k: 'Code', text: 'Short programs you run straight away and change line by line.' },
  { k: 'Build', text: 'Finish with a real project you can show off, then remix it.' },
];

const UNITS = [
  { title: 'Getting started', text: 'The Quark controller, the base plate and Zap connectors. Your first blink.', parts: ['quark', 'plate', 'zap'] },
  { title: 'Sensing the world', text: 'Distance, light, temperature and humidity: read real values and make sense of them.', parts: ['ultrasonic', 'light', 'dht11'] },
  { title: 'Inputs you control', text: 'Buttons, knobs and remotes. Turn a press or a twist into an action.', parts: ['buttons', 'pot', 'ir'] },
  { title: 'Make it move and sound', text: 'Servos, buzzers and RGB light. Give your builds motion, sound and colour.', parts: ['servo', 'buzzer', 'rgb'] },
  { title: 'Show and identify', text: 'Draw on an OLED screen and read RFID cards to build smart gadgets.', parts: ['oled', 'rfid'] },
  { title: 'Capstone builds', text: 'Put it all together: a smart door, a weather station, a parking assistant.', parts: ['quark', 'ultrasonic', 'oled', 'servo'] },
];
const nameOf = (id: string) => PARTS.find(p => p.id === id)?.name ?? id;

/* Course: the full StemGrid curriculum. Not built yet, so this page is a "coming soon" preview. */
export default async function CoursePage() {
  const { user, profile } = await getSession();
  if (!user) redirect('/login?next=/course');
  const viewer = toViewer(user, profile)!;

  return (
    <div className={`${s.root} ${s.app}`}>
      <AppNav viewer={viewer} />

      <section className={c.hero}>
        <div className={c.heroIn}>
          <div className={c.heroTx}>
            <span className={c.soon}><i />Coming soon</span>
            <h1>Course</h1>
            <p className={c.tagline}>Every sensor. Every module.<br /><span>End to end.</span></p>
            <p className={c.intro}>
              Learn how every part works, from the inside out, in the most interactive way: hands-on lessons
              right in the simulator and a lot of projects along the way.
            </p>
          </div>
          <Explorer />
        </div>
      </section>

      <main className={s.wrap}>
        <section className={c.block}>
          <div className={c.secHead}>
            <span className={c.eyebrow}>How every lesson works</span>
            <h2>Four moves, every part</h2>
          </div>
          <ol className={c.moves}>
            {MOVES.map((m, k) => (
              <li key={m.k} style={{ ['--i' as string]: k }}>
                <span className={c.moveN}>{k + 1}</span>
                <b>{m.k} it</b>
                <p>{m.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={c.block}>
          <div className={c.secHead}>
            <span className={c.eyebrow}>The path</span>
            <h2>Six units, from first blink to capstone</h2>
          </div>
          <ol className={c.path}>
            {UNITS.map((u, k) => (
              <li key={u.title} style={{ ['--i' as string]: k }}>
                <span className={c.node}>{String(k + 1).padStart(2, '0')}</span>
                <div className={c.unit}>
                  <div>
                    <b>{u.title}</b>
                    <p>{u.text}</p>
                    <div className={c.tags}>{u.parts.map(p => <span key={p}>{nameOf(p)}</span>)}</div>
                  </div>
                  <span className={c.lock}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                    Soon
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={c.cta}>
          <div>
            <b>Can&apos;t wait?</b>
            <p>TinkerAI&apos;s guided projects are ready now. Build one while the course is on its way.</p>
          </div>
          <Link href="/tinkerai" className={`${s.btn} ${s.btnRed}`}>Try TinkerAI</Link>
        </section>
      </main>
    </div>
  );
}
