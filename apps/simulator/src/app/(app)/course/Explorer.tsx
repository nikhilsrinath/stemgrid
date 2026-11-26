'use client';

import { useEffect, useRef, useState } from 'react';
import { PARTS } from './parts';
import c from './course.module.css';

/* The Course hero's part explorer: the real simulator models on a turntable (/simulator?demo=parts in an
   iframe, driven through window.__sgShow, see SHOWCASE DRIVER in src/simulator/engine.js). It steps through
   every part on its own; picking one in the rail holds it for a while. */
type Show = { show: (id: string) => void };
const showOf = (f: HTMLIFrameElement | null) => (f?.contentWindow as (Window & { __sgShow?: Show }) | null)?.__sgShow;


const STEP_MS = 5200, HOLD_MS = 16000;

export default function Explorer() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState(false);
  const calm = useRef(false);

  // wait for the engine inside the iframe
  useEffect(() => {
    calm.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setInterval(() => { if (showOf(frame.current)) { setReady(true); clearInterval(t); } }, 150);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (ready) showOf(frame.current)?.show(PARTS[i].id); }, [ready, i]);
  // step through the parts; a pick holds the current one for a while
  useEffect(() => {
    if (!ready || calm.current) return;
    const t = setTimeout(() => { setHeld(false); setI(n => (n + 1) % PARTS.length); }, held ? HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [ready, i, held]);

  const p = PARTS[i];
  const pick = (k: number) => { setHeld(true); setI(k); };

  return (
    <div className={c.explorer}>
      <div className={c.stage}>
        <div className={c.pedestal} aria-hidden="true" />
        <iframe ref={frame} src="/simulator?demo=parts" title={`3D model: ${p.name}`} tabIndex={-1} className={ready ? c.on : ''} />
        {!ready && <div className={c.loading} aria-hidden="true"><span /></div>}
        <span className={`${c.corner} ${c.tl}`} /><span className={`${c.corner} ${c.tr}`} />
        <span className={`${c.corner} ${c.bl}`} /><span className={`${c.corner} ${c.br}`} />
        <span className={c.live}><i />Live 3D · the same models as the simulator</span>

        <div className={c.card} key={p.id} aria-live="polite">
          <span className={c.cardCat}>{p.cat}<em>{String(i + 1).padStart(2, '0')} / {PARTS.length}</em></span>
          <b>{p.name}</b>
          <p>{p.learn}</p>
          <ul>
            <li>How it works</li><li>Wiring</li><li>Code</li><li>Projects</li>
          </ul>
        </div>
      </div>

      <div className={c.rail} role="tablist" aria-label="Parts in the course">
        {PARTS.map((q, k) => (
          <button key={q.id} role="tab" aria-selected={k === i} onClick={() => pick(k)}
            className={k === i ? (held ? c.held : c.cur) : ''} style={{ ['--t' as string]: `${(held ? HOLD_MS : STEP_MS) / 1000}s` }}>
            <span>{q.name}</span>
            {k === i && <i key={`${i}-${held}`} />}
          </button>
        ))}
      </div>
    </div>
  );
}
