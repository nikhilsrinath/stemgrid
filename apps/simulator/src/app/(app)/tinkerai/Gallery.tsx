'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LEVEL_LABEL, LEVELS, partName, PARTS, type Level, type TutorialCard } from '@/lib/tutorials';
import s from '@/ui/ui.module.css';
import g from './tinkerai.module.css';

export type Progress = { step: number; done: boolean };
type Card = TutorialCard & { stepCount: number };
type Sort = 'recommended' | 'parts' | 'quick' | 'az';

// parts every build has; "Sort by components" and the part filter look at the rest
const COMMON = new Set(['plate', 'quark', 'zap']);
const keyParts = (c: Card) => c.parts.filter(p => !COMMON.has(p));

export default function Gallery({ tutorials, progress, loadError }: { tutorials: Card[]; progress: Record<string, Progress>; loadError: boolean }) {
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [part, setPart] = useState('');
  const [sort, setSort] = useState<Sort>('recommended');

  const partsUsed = useMemo(() => [...new Set(tutorials.flatMap(keyParts))].sort((a, b) => partName(a).localeCompare(partName(b))), [tutorials]);
  const counts = useMemo(() => Object.fromEntries(LEVELS.map(l => [l, tutorials.filter(t => t.level === l).length])), [tutorials]);

  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    const list = tutorials.filter(t =>
      (!level || t.level === level) && (!part || t.parts.includes(part)) &&
      (!f || `${t.title} ${t.summary} ${t.parts.map(partName).join(' ')}`.toLowerCase().includes(f)));
    const by: Record<Sort, (a: Card, b: Card) => number> = {
      recommended: (a, b) => a.sort - b.sort || a.title.localeCompare(b.title),
      parts: (a, b) => keyParts(a).length - keyParts(b).length || (keyParts(a)[0] ?? '').localeCompare(keyParts(b)[0] ?? '') || a.title.localeCompare(b.title),
      quick: (a, b) => a.minutes - b.minutes || a.title.localeCompare(b.title),
      az: (a, b) => a.title.localeCompare(b.title),
    };
    return list.sort(by[sort]);
  }, [tutorials, q, level, part, sort]);

  const doneCount = tutorials.filter(t => progress[t.id]?.done).length;

  return (
    <>
      <div className={s.head}>
        <div>
          <span className={g.kicker}><Spark />Learn by building</span>
          <h1 className={s.h2}>TinkerAI</h1>
          <p className={s.lead}>Pick a project and TinkerAI guides you step by step: which part to add, where to plug it, and what the code does.</p>
        </div>
        {tutorials.length > 0 && <div className={g.score}><b>{doneCount}</b><span>of {tutorials.length} done</span></div>}
      </div>

      <div className={g.toolbar}>
        <div className={g.levels} role="group" aria-label="Level">
          <button aria-pressed={level === ''} onClick={() => setLevel('')}>All <i>{tutorials.length}</i></button>
          {LEVELS.map(l => (
            <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} data-level={l}>{LEVEL_LABEL[l]} <i>{counts[l]}</i></button>
          ))}
        </div>
        <div className={s.tools}>
          <label className={s.search}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <span className={s.srOnly}>Search tutorials</span>
            <input className={s.input} type="search" placeholder="Search tutorials" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          {partsUsed.length > 0 && (
            <label>
              <span className={s.srOnly}>Uses part</span>
              <select className={s.select} value={part} onChange={e => setPart(e.target.value)}>
                <option value="">Any part</option>
                {partsUsed.map(p => <option key={p} value={p}>{partName(p)}</option>)}
              </select>
            </label>
          )}
          <label>
            <span className={s.srOnly}>Sort by</span>
            <select className={s.select} value={sort} onChange={e => setSort(e.target.value as Sort)}>
              <option value="recommended">Recommended order</option>
              <option value="parts">Sort by components</option>
              <option value="quick">Quickest first</option>
              <option value="az">A to Z</option>
            </select>
          </label>
        </div>
      </div>

      {loadError && <div className={s.error} role="alert" style={{ marginBottom: 20 }}>Couldn&apos;t load the tutorials. Reload the page to try again.</div>}

      <div className={g.sectionHead}>
        <b>{level ? `${LEVEL_LABEL[level]} tutorials` : 'All tutorials'}</b>
        <span>{shown.length}</span>
      </div>

      {tutorials.length === 0 && !loadError ? (
        <div className={s.empty}>
          <h3>Tutorials are on their way</h3>
          <p>New guided projects will show up here soon.</p>
        </div>
      ) : (
        <div className={g.grid}>
          {shown.map(t => <TutorialTile key={t.id} t={t} p={progress[t.id]} />)}
          {shown.length === 0 && <p className={s.lead}>No tutorials match. Try another search or level.</p>}
        </div>
      )}
    </>
  );
}

function TutorialTile({ t, p }: { t: Card; p?: Progress }) {
  const href = `/simulator?tutorial=${encodeURIComponent(t.slug)}`;
  const pics = t.parts.filter(x => x !== 'plate' && PARTS[x]);
  const started = p && !p.done && p.step > 0;
  // the finished build rendered by the simulator (public/assets/tinkerai/<slug>.webp); tutorials without
  // one yet (say, a new one added on the console) keep the drawn parts picture underneath
  const [cover, setCover] = useState<'loading' | 'ok' | 'none'>('loading');
  return (
    <article className={g.card}>
      <Link href={href} className={g.art} tabIndex={-1} aria-hidden="true">
        {cover !== 'ok' && <>
          <span className={g.plate} />
          <span className={g.pics} data-n={Math.min(pics.length, 4)}>
            {pics.slice(0, 4).map(x => <img key={x} src={PARTS[x].img} alt="" loading="lazy" />)}
          </span>
        </>}
        {cover !== 'none' && (
          <img className={g.cover} data-on={cover === 'ok'} src={`/assets/tinkerai/${t.slug}.webp`} alt="" loading="lazy"
            ref={el => { if (el?.complete && cover === 'loading') setCover(el.naturalWidth ? 'ok' : 'none'); }}
            onLoad={() => setCover('ok')} onError={() => setCover('none')} />
        )}
        {p?.done && <span className={g.doneBadge}><Tick />Completed</span>}
      </Link>
      <div className={g.body}>
        <div className={g.tags}>
          <span className={g.level} data-level={t.level}>{LEVEL_LABEL[t.level]}</span>
          <span className={g.tag}>Quark C3</span>
          <span className={g.tag}>{t.minutes} min</span>
        </div>
        <Link href={href} className={g.title}>{t.title}</Link>
        <p className={g.summary}>{t.summary}</p>
        <div className={g.foot}>
          <span className={g.parts}>{t.parts.filter(x => !COMMON.has(x)).map(partName).join(' · ') || 'Quark C3 only'}</span>
          {started && (
            <span className={g.prog} title={`Last time you got to step ${p.step + 1} of ${t.stepCount}`}>
              <span style={{ width: `${Math.round((p.step / Math.max(1, t.stepCount)) * 100)}%` }} />
            </span>
          )}
          <span className={g.go}>{p?.done ? 'Do it again' : started ? 'Start again' : 'Start'} →</span>
        </div>
      </div>
    </article>
  );
}

const Tick = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const Spark = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5 14.2 12.7 12 19l-2.2-6.3L3.5 10.5l6.3-2.2z" /><circle cx="19" cy="19" r="2" /></svg>;
