'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Simulator, PointSpec, TableFacts } from '@/simulator/engine';
import { currentStep, partName, PARTS, readingOf, tryOk, type Memory, type Step, type Tutorial } from '@/lib/tutorials';
import { supabaseBrowser } from '@/lib/supabase/client';
import { createProject } from '@/lib/projects';
import type { BuildData, Viewer } from '@/lib/types';
import t from './tutor.module.css';

/* TinkerAI: walks a student through one tutorial inside the simulator.
   A "Next step" card at the top left, the step list with progress on the right, and a pulsing
   beacon on the thing to use next. Every 250 ms it asks the engine what's on the table
   (sim.tutor.inspect) and moves on when the current step is done. The code step fills in the
   program read-only and explains it; the student only presses Run. */
export default function Tutor({ sim, tutorial, viewer }: { sim: Simulator; tutorial: Tutorial; viewer: Viewer }) {
  const steps = tutorial.steps;
  const [facts, setFacts] = useState<TableFacts>(() => sim.tutor.inspect());
  const [mem, setMem] = useState<Memory>({ codeRead: false, tried: false });
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState<number | null>(null);
  const [saving, setSaving] = useState<'idle' | 'busy' | 'error'>('idle');
  const beacon = useRef<HTMLDivElement>(null);
  const hand = useRef<HTMLDivElement>(null);
  const stepsEl = useRef<HTMLOListElement>(null);

  const [finished, setFinished] = useState(false);
  const raw = currentStep(steps, facts, mem);
  const i = finished ? steps.length : raw;          // once finished it stays finished, whatever they change next
  const step: Step | undefined = steps[i];
  const done = i >= steps.length;
  useEffect(() => { if (raw >= steps.length) setFinished(true); }, [raw, steps.length]);
  const pct = Math.round((i / steps.length) * 100);

  // read the table a few times a second
  useEffect(() => {
    const id = window.setInterval(() => setFacts(sim.tutor.inspect()), 250);
    return () => clearInterval(id);
  }, [sim]);

  // the panel starts folded on small screens
  useEffect(() => { if (window.innerWidth < 1100) setOpen(false); }, []);

  // body classes move the inspector and code panel out of the panel's way
  useEffect(() => {
    document.body.classList.add('tutoring');
    return () => document.body.classList.remove('tutoring', 'tut-open');
  }, []);
  useEffect(() => { document.body.classList.toggle('tut-open', open); }, [open]);

  // the last step is "make it happen": remember once it has
  useEffect(() => {
    if (step?.do === 'try' && !mem.tried && tryOk(step, facts)) setMem(m => ({ ...m, tried: true }));
  }, [step, facts, mem.tried]);

  // entering a step: light up its part, fill in the code
  useEffect(() => {
    if (!step) { sim.tutor.highlightPart(null); sim.tutor.lockCode(false); sim.tutor.markLines(null); return; }
    sim.tutor.highlightPart(step.do === 'add' ? step.part : null);
    if (step.do === 'code' || step.do === 'run') sim.tutor.setCode(tutorial.code, true);
    if (step.do === 'try') sim.tutor.openCode(false);          // the code panel would hide the build; the panel shows the reading
    stepsEl.current?.querySelector('[data-s="now"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (step.do !== 'code') { sim.tutor.markLines(null); setNote(null); }
    // i is the step's identity; the rest only changes with it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  useEffect(() => () => { sim.tutor.highlightPart(null); sim.tutor.lockCode(false); sim.tutor.markLines(null); }, [sim]);

  // save how far the student got (signed in only)
  const best = useRef(0);
  useEffect(() => {
    if (!viewer || i <= best.current) return;
    best.current = i;
    supabaseBrowser().from('tutorial_progress').upsert({
      user_id: viewer.id, tutorial_id: tutorial.id, step: i,
      ...(i >= steps.length ? { completed_at: new Date().toISOString() } : {}),
    }).then(({ error }) => { if (error) console.warn('[tinkerai] progress not saved', error.message); });
  }, [i, viewer, tutorial.id, steps.length]);

  // the beacon follows its target every frame (the camera can move)
  const target = useMemo(() => beaconTarget(step, facts.codeOpen), [step, facts.codeOpen]);
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const el = beacon.current;
      if (el) {
        const p = !target ? null : 'el' in target ? centreOf(target.el) : sim.tutor.pointAt(target);
        el.style.display = p ? 'block' : 'none';
        if (p) el.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, sim]);

  // "add" steps: a hand shows the move, from the lit-up part in the library onto the table
  const handPart = step?.do === 'add' ? step.part : null;
  useEffect(() => {
    const el = hand.current;
    if (!el) return;
    if (!handPart) { el.style.display = 'none'; return; }
    let raf = 0, down = false;
    const onDown = () => { down = true; }, onUp = () => { down = false; };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    const frame = () => {
      const pal = document.getElementById('partsPal');
      const item = pal?.querySelector<HTMLElement>('.item.tut');
      const lib = document.getElementById('lib')?.getBoundingClientRect();
      const stage = document.getElementById('stage')?.getBoundingClientRect();
      const r = item?.getBoundingClientRect();
      const palOpen = !!pal?.classList.contains('open');
      const shown = !down && palOpen && r && lib && stage && r.width > 0 &&
        r.top + r.height / 2 > lib.top && r.top + r.height / 2 < lib.bottom;
      // library closed (desktop sidebar hidden, or the tablet dialog shut): tap the Parts button to open it
      const fab = !palOpen && !down ? document.querySelector('#partsFab .pf-ic')?.getBoundingClientRect() : null;
      if (fab && fab.width > 0) {
        el.dataset.mode = 'tap';
        el.style.display = 'block';
        el.style.transform = `translate(${fab.left + fab.width / 2}px, ${fab.top + fab.height / 2}px)`;
      } else if (!shown) el.style.display = 'none';
      else {
        el.dataset.mode = 'drag';
        const thumb = item!.querySelector('.th')?.getBoundingClientRect() ?? r!;
        const sx = thumb.left + thumb.width / 2, sy = thumb.top + thumb.height / 2;
        // drop point: the middle of the table left of the TinkerAI panel, and clear of the parts dialog on tablets
        let right = stage!.right;
        if (document.body.classList.contains('tut-open') && window.innerWidth > 760) right -= 344;
        const pr = pal!.getBoundingClientRect();
        let ex = stage!.left + (right - stage!.left) / 2, ey = stage!.top + stage!.height * 0.45;
        if (pr.left > stage!.left + 40 && ex > pr.left - 60) ex = Math.max(stage!.left + 80, pr.left - 120);
        el.style.display = 'block';
        el.style.transform = `translate(${sx}px, ${sy}px)`;
        el.style.setProperty('--dx', `${ex - sx}px`);
        el.style.setProperty('--dy', `${ey - sy}px`);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      el.style.display = 'none';
    };
  }, [handPart]);

  const showNote = (k: number | null) => {
    setNote(k);
    const n = k == null || step?.do !== 'code' ? null : step.notes?.[k];
    sim.tutor.markLines(n ? n.lines : null);
  };

  const saveAsProject = async () => {
    setSaving('busy');
    try {
      const row = await createProject(tutorial.title, sim.serialize() as BuildData);
      location.assign(`/simulator/${row.id}`);
    } catch { setSaving('error'); }
  };

  return (
    <>
      <div ref={beacon} className={t.beacon} aria-hidden="true"><i /></div>

      <div ref={hand} className={t.hand} aria-hidden="true">
        <div className={t.handMove}>
          {handPart && PARTS[handPart] && <img className={t.handGhost} src={PARTS[handPart].img} alt="" />}
          <span className={t.handTap} />
          <HandIcon />
          <span className={`${t.handLabel} ${t.forDrag}`}>Drag onto the table</span>
          <span className={`${t.handLabel} ${t.forTap}`}>Open Parts to find the {handPart ? partName(handPart) : 'part'}</span>
        </div>
      </div>

      <div className={t.bar} role="status" aria-live="polite">
        {done ? (
          <>
            <span className={`${t.barIc} ${t.barDone}`}>✓</span>
            <div className={t.barTx}>
              <span className={t.kicker}>Tutorial complete</span>
              <b>You built it! The code is yours to change now.</b>
            </div>
          </>
        ) : step && (
          <>
            <span className={t.barIc}>{i + 1}</span>
            <div className={t.barTx}>
              <span className={t.kicker}>Next step <em>·</em> {i + 1}/{steps.length}</span>
              <b>{step.title}</b>
              <span className={t.barHint}>{step.hint}</span>
            </div>
            {'part' in step && PARTS[step.part] && step.do === 'add' && <img className={t.barImg} src={PARTS[step.part].img} alt="" />}
          </>
        )}
      </div>

      {!open && (
        <button className={t.pill} onClick={() => setOpen(true)} aria-label="Show tutorial progress">
          <Ring pct={pct} size={28} />
          <span><b>TinkerAI</b>{done ? 'Done' : `${i}/${steps.length} steps`}</span>
        </button>
      )}

      <aside className={t.panel} data-open={open} data-stage-overlay aria-label="Tutorial progress">
        <header className={t.head}>
          <div className={t.headTx}>
            <span className={t.meta}><Spark />TinkerAI<em>·</em>{done ? 'Complete' : `Step ${i + 1} of ${steps.length}`}</span>
            <h2 title={tutorial.title}>{tutorial.title}</h2>
          </div>
          <button className={t.fold} onClick={() => setOpen(false)} aria-label="Hide tutorial progress" title="Hide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </header>

        <ol className={t.steps} ref={stepsEl}>
          {steps.map((s, k) => {
            const state = k < i ? 'done' : k === i ? 'now' : 'next';
            return (
              <li key={k} data-s={state}>
                <span className={t.dot}>{state === 'done' ? <Tick /> : k + 1}</span>
                <div className={t.stepBody}>
                  <b>{s.title}</b>
                  {state === 'now' && (
                    <div className={t.now}>
                      <span className={t.doNow}><i />Do this now</span>
                      <p>{s.hint}</p>
                      {s.why && <p className={t.why}>{s.why}</p>}
                      {s.do === 'code' && (
                        <>
                          {!!s.notes?.length && (
                            <ul className={t.notes}>
                              {s.notes.map((n, j) => (
                                <li key={j}>
                                  <button data-on={note === j} onMouseEnter={() => showNote(j)} onFocus={() => showNote(j)} onClick={() => showNote(j)}>
                                    <span className={t.ln}>Line {n.lines.length > 1 ? `${Math.min(...n.lines)}–${Math.max(...n.lines)}` : n.lines[0]}</span>
                                    {n.text}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!facts.codeOpen && <button className={t.ghostBtn} onClick={() => sim.tutor.openCode(true)}>Show the code</button>}
                          <button className={t.primary} onClick={() => { showNote(null); setMem(m => ({ ...m, codeRead: true })); }}>Got it, next step</button>
                        </>
                      )}
                      {s.do === 'run' && !facts.codeOpen && <button className={t.ghostBtn} onClick={() => sim.tutor.openCode(true)}>Open the code panel</button>}
                      {s.do === 'try' && <TryMeter step={s} facts={facts} />}
                    </div>
                  )}
                  {state !== 'now' && 'part' in s && s.do === 'add' && <span className={t.sub}>{partName(s.part)}</span>}
                </div>
              </li>
            );
          })}
        </ol>

        {done && (
          <div className={t.finish}>
            <b>Nicely done!</b>
            <p>{tutorial.outro || 'The code is unlocked now. Change something, press Run, and see what happens.'}</p>
            <div className={t.finishBtns}>
              {viewer && <button className={t.primary} onClick={saveAsProject} disabled={saving === 'busy'}>{saving === 'busy' ? 'Saving…' : 'Save as a project'}</button>}
              <Link className={t.ghostBtn} href="/tinkerai">More tutorials</Link>
            </div>
            {saving === 'error' && <p className={t.err}>Couldn&apos;t save it. Check your connection and try again.</p>}
          </div>
        )}

        <footer className={t.foot}>
          <Link href="/tinkerai">← Leave tutorial</Link>
        </footer>
      </aside>
    </>
  );
}

function beaconTarget(step: Step | undefined, codeOpen: boolean): PointSpec | { el: string } | null {
  if (!step) return null;
  switch (step.do) {
    case 'add': return null;                                   // the parts list lights the part up instead
    case 'plug': return { kind: step.part, at: 'free-port' };
    case 'wire': return { kind: step.to, at: 'free-port' };
    case 'code': return codeOpen ? null : { el: 'codeFab' };
    case 'run': return { el: codeOpen ? 'ceRun' : 'codeFab' };
    case 'try': return { kind: step.part, at: 'target' };
  }
}
// buttons get the beacon on their top-right corner, so it never covers the label
function centreOf(id: string): [number, number] | null {
  const r = document.getElementById(id)?.getBoundingClientRect();
  return r && r.width ? [r.right - 4, r.top + 4] : null;
}

// the live reading the "try" step is waiting for, and the outputs it wants to see
function TryMeter({ step, facts }: { step: Extract<Step, { do: 'try' }>; facts: TableFacts }) {
  const r = readingOf(step.part, facts);
  const board = facts.modules.find(m => m.running);
  const sounding = facts.modules.some(m => m.sound);
  if (!r) return null;
  const unit = r.unit === 'cm' ? ' cm' : r.unit;
  const isButton = step.part === 'buttons';
  const now = isButton ? (r.value ? 'pressed' : 'not pressed') : `${r.value}${unit}`;
  const goal = isButton ? 'press it'
    : [step.above != null && `over ${step.above}${unit}`, step.below != null && `under ${step.below}${unit}`].filter(Boolean).join(' and ');
  return (
    <div className={t.meter}>
      <span>{r.label} now <b>{now}</b>{goal && <> · goal: {goal}</>}</span>
      {step.led && <span className={t.led} data-on={!!board?.led}><i />Light {board?.led ? 'on' : 'off'}</span>}
      {step.sound && <span className={t.led} data-on={sounding}><i />Buzzer {sounding ? 'sounding' : 'quiet'}</span>}
    </div>
  );
}

function Ring({ pct, size }: { pct: number; size: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  return (
    <span className={t.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sg-red)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
    </span>
  );
}
// a pointing hand; its fingertip is at the top-left of the box (the element's origin)
const HandIcon = () => (
  <svg className={t.handIc} width="34" height="38" viewBox="0 0 34 38" aria-hidden="true">
    <path d="M9.5 3.2a2.7 2.7 0 0 1 5.4 0v11.1l1.1-.2a2.6 2.6 0 0 1 3.3 2l.1.4.4-.1a2.6 2.6 0 0 1 3.2 2.1l.1.4.5-.1a2.6 2.6 0 0 1 3.2 2.3l.5 5.3c.4 4.3-1.5 8-5.5 9.4l-.6.2c-3.4 1.1-7.2.1-9.6-2.6l-7.4-8.4a2.7 2.7 0 0 1 3.7-3.9l2.1 1.8z"
      fill="#fff" stroke="#1a1a1a" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M15 21.5v5.2M19.4 22.2v4.6M23.6 23.4v3.8" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const Tick = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const Spark = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5 14.2 12.7 12 19l-2.2-6.3L3.5 10.5l6.3-2.2z" /><circle cx="19" cy="19" r="2" /></svg>;
