'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { startSimulator, type Simulator } from '@/simulator/engine';
import styles from '@/simulator/styles';
import markup from '@/simulator/markup';
import { cleanName, createProject, draft, saveProject, uploadThumbnail, type Draft } from '@/lib/projects';
import { supabaseBrowser } from '@/lib/supabase/client';
import { initials, type BuildData, type Viewer } from '@/lib/types';

type Props = {
  viewer: Viewer;
  project?: { id: string; name: string; data: BuildData } | null;
};

const CLAIM_NEXT = '/simulator?claim=1';
const THUMB_EVERY = 30_000;

/* The simulator is the original imperative Three.js app. React only gives it a host element:
   on mount we add its stylesheet and markup, then start the engine. On unmount we stop it and
   remove both, so its global CSS (html/body/button) never leaks onto other pages.
   This component also owns saving: signed-in users autosave to Supabase (projects table),
   guests keep a draft in localStorage that they can claim after signing in. */
export default function SimulatorHost({ viewer, project }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [acctEl, setAcctEl] = useState<HTMLElement | null>(null);
  const [modal, setModal] = useState<null | { kind: 'signin' } | { kind: 'restore'; d: Draft }>(null);
  const api = useRef<{ sim: Simulator; saveNow: () => Promise<void>; restore: (d: Draft) => void } | null>(null);

  // These survive React Strict Mode's mount → unmount → mount, so a new build is only created once.
  const pid = useRef<string | null>(project?.id ?? null);
  const creating = useRef<Promise<string> | null>(null);
  // What to open, decided on the first mount only (the claim step rewrites the URL).
  const boot = useRef<{ claim: Draft | null; restore: Draft | null } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const params = new URLSearchParams(location.search);
    const demo = params.has('demo');
    if (!boot.current) {
      const d = project || demo ? null : draft.get();
      const usable = d && Array.isArray(d.data?.modules) ? d : null;
      const claim = viewer && params.has('claim') ? usable : null;
      boot.current = { claim, restore: claim ? null : usable };
    }
    const { claim, restore } = boot.current;

    const style = document.createElement('style');
    style.dataset.stemgrid = 'simulator';
    style.textContent = styles;
    document.head.appendChild(style);
    el.innerHTML = markup;

    const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
    const stateEl = $('saveState'), nameEl = $('docName'), saveBtn = $<HTMLButtonElement>('saveBtn'), homeBtn = $<HTMLButtonElement>('homeBtn');
    if (demo) [stateEl, saveBtn, $('acct')].forEach(n => (n.style.display = 'none'));

    /* ---------------- save state ---------------- */
    let name = project?.name ?? 'Untitled build', savedName = name;
    let lastKey: string | null = null;           // the build as last saved, minus the camera
    let timer = 0, retryT = 0, fails = 0, lastThumb = 0, busy = false, again = false, alive = true;

    const setStatus = (s: string, text: string, title = '') => { stateEl.dataset.s = s; stateEl.textContent = text; stateEl.title = title; };
    const snap = () => {
      const d = sim.serialize();
      const { camera: _camera, ...rest } = d;
      return { d: d as BuildData, key: JSON.stringify(rest) };
    };
    const isDirty = () => snap().key !== lastKey || name !== savedName;
    const tabTitle = () => (demo ? document.title : `${name} · StemGrid Beta`);
    const showName = () => { nameEl.textContent = name; document.title = tabTitle(); };
    // Next streams page metadata in after mount and would put its own <title> back: keep the build's name
    const titleObs = new MutationObserver(() => { if (document.title !== tabTitle()) document.title = tabTitle(); });
    titleObs.observe(document.head, { childList: true, subtree: true, characterData: true });

    function ensureProject(d: BuildData): Promise<string> | string {
      if (pid.current) return pid.current;
      creating.current ??= createProject(name, d).then(row => {
        pid.current = row.id;
        history.replaceState(history.state, '', `/simulator/${row.id}`);
        return row.id;
      }).finally(() => { creating.current = null; });
      return creating.current;
    }

    async function thumb(id: string) {
      if (!viewer) return;
      const blob = await sim.snapshot();
      if (!blob) return;
      const path = await uploadThumbnail(viewer.id, id, blob);
      await saveProject(id, { thumbnail_path: path });
      lastThumb = Date.now();
    }

    async function tick(opts: { thumb?: boolean; create?: boolean } = {}) {
      if (demo || !alive) return;
      clearTimeout(timer);
      const { d, key } = snap();
      const changed = key !== lastKey || name !== savedName;

      if (!viewer) {                               // guest: keep a local draft
        if (changed && !sim.isEmpty()) draft.set({ name, data: d, at: Date.now() });
        if (changed) { lastKey = key; savedName = name; }
        if (sim.isEmpty()) setStatus('guest', '');
        else setStatus('guest', 'Not saved · sign in to keep it', 'Your build is kept in this browser for now. Sign in to save it to your projects.');
        return;
      }
      if (!changed && !opts.thumb) return;
      if (!pid.current && sim.isEmpty() && !opts.create) { lastKey = key; return; }   // don't make empty projects
      if (busy) { again = true; return; }
      busy = true;
      setStatus('saving', 'Saving…');
      try {
        const wasNew = !pid.current;
        const id = await ensureProject(d);
        if (!wasNew || changed) await saveProject(id, { data: d, name });
        lastKey = key; savedName = name; fails = 0;
        if (opts.thumb || wasNew || Date.now() - lastThumb > THUMB_EVERY) await thumb(id).catch(() => {});
        if (alive) setStatus('saved', 'Saved', 'Saved ' + new Date().toLocaleTimeString());
      } catch (e) {
        fails++;
        if (alive) {
          setStatus('error', "Couldn't save · retrying", e instanceof Error ? e.message : '');
          retryT = window.setTimeout(() => tick(), Math.min(30_000, 2000 * 2 ** fails));
        }
      } finally {
        busy = false;
        if (again && alive) { again = false; poke(); }
      }
    }
    const poke = () => { clearTimeout(timer); timer = window.setTimeout(() => tick(), 1500); };

    const sim = startSimulator({ onChange: poke });

    /* ---------------- what to open ---------------- */
    if (project) {
      sim.load(project.data);
      lastKey = snap().key;
      setStatus('saved', 'Saved');
    } else if (!demo) {
      if (claim) {
        // a guest build, brought over after signing in: save it as a new project
        name = claim.name || name; sim.load(claim.data);
        if (!pid.current) history.replaceState(history.state, '', '/simulator');
        tick({ create: true, thumb: true }).then(() => {
          if (pid.current) { draft.clear(); sim.toast('Saved to your projects.'); }
        });
      } else if (restore) {
        setModal({ kind: 'restore', d: restore });
        lastKey = snap().key;
      } else {
        lastKey = snap().key;
      }
      if (!viewer) tick();
    }
    showName();

    const saveNow = async () => {
      if (!viewer) { await tick(); setModal({ kind: 'signin' }); return; }
      await tick({ thumb: true, create: true });
      if (stateEl.dataset.s === 'saved') { saveBtn.classList.add('done'); setTimeout(() => saveBtn.classList.remove('done'), 1200); }
    };
    api.current = {
      sim, saveNow,
      restore(d) { name = d.name || name; sim.load(d.data); showName(); if (viewer) poke(); else draft.set(d); },
    };

    /* ---------------- app bar wiring ---------------- */
    const goHome = () => router.push(viewer ? '/projects' : '/');
    homeBtn.addEventListener('click', goHome);
    homeBtn.title = viewer ? 'Back to your projects' : 'Back to the StemGrid home page';
    saveBtn.addEventListener('click', saveNow);
    const onStateClick = () => { if (!viewer && !demo) setModal({ kind: 'signin' }); };
    stateEl.addEventListener('click', onStateClick);

    const commitName = () => {
      const next = cleanName(nameEl.textContent || '');
      if (next !== name) { name = next; poke(); }
      showName();
    };
    const nameKeys = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
      if (e.key === 'Escape') { nameEl.textContent = name; nameEl.blur(); }
    };
    const namePaste = (e: ClipboardEvent) => {            // plain text only
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' '));
    };
    nameEl.addEventListener('blur', commitName);
    nameEl.addEventListener('keydown', nameKeys);
    nameEl.addEventListener('paste', namePaste);
    if (demo) nameEl.contentEditable = 'false';

    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !demo) { e.preventDefault(); saveNow(); }
    };
    window.addEventListener('keydown', keys, true);

    // knob drags in the 3D view don't always report a change, so check now and then too
    const poll = window.setInterval(() => { if (!document.hidden && !busy) tick(); }, 5000);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (demo) return;
      if (!viewer) { tick(); return; }
      if (isDirty() || busy) e.preventDefault();
    };
    const onHide = () => { if (document.hidden && !demo) tick({ thumb: !!viewer && !!pid.current }); };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', onHide);

    // The shortcuts popover is a <details>; close it when clicking anywhere else.
    const help = el.querySelector<HTMLDetailsElement>('#helpMenu');
    const closeHelp = (e: PointerEvent) => {
      if (help?.open && !help.contains(e.target as Node)) help.open = false;
    };
    document.addEventListener('pointerdown', closeHelp);
    setAcctEl(demo ? null : $('acct'));

    return () => {
      // leaving the page inside the app: send any unsaved work before the engine goes away
      if (!demo) {
        const { d, key } = snap();
        if (!viewer) { if (!sim.isEmpty() && key !== lastKey) draft.set({ name, data: d, at: Date.now() }); }
        else if (pid.current && (key !== lastKey || name !== savedName)) {
          const id = pid.current;
          const shot = sim.snapshot();
          saveProject(id, { data: d, name }).then(async () => {
            const b = await shot; if (b && viewer) await uploadThumbnail(viewer.id, id, b).then(p => saveProject(id, { thumbnail_path: p }));
          }).catch(() => {});
        }
      }
      alive = false;
      titleObs.disconnect();
      clearTimeout(timer); clearTimeout(retryT); clearInterval(poll);
      window.removeEventListener('keydown', keys, true);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', onHide);
      document.removeEventListener('pointerdown', closeHelp);
      homeBtn.removeEventListener('click', goHome);
      saveBtn.removeEventListener('click', saveNow);
      stateEl.removeEventListener('click', onStateClick);
      nameEl.removeEventListener('blur', commitName);
      nameEl.removeEventListener('keydown', nameKeys);
      nameEl.removeEventListener('paste', namePaste);
      setAcctEl(null);
      api.current = null;
      sim.stop();
      el.innerHTML = '';
      style.remove();
    };
    // viewer and project come from the server for this page load; they don't change while mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = (to: 'login' | 'signup') => {
    router.push(`/${to}?next=${encodeURIComponent(CLAIM_NEXT)}`);
  };

  return (
    <>
      <div ref={host} />
      {acctEl && createPortal(
        <AccountMenu viewer={viewer} onSignIn={() => setModal({ kind: 'signin' })} onBeforeLeave={() => api.current?.saveNow()} />,
        acctEl,
      )}
      {modal?.kind === 'signin' && (
        <div className="sg-modal" role="dialog" aria-modal="true" aria-labelledby="sg-m-h" onPointerDown={e => e.target === e.currentTarget && setModal(null)}>
          <div className="card">
            <h3 id="sg-m-h">Sign in to save your build</h3>
            <p>Your build stays safe in this browser while you sign in. Then it&apos;s saved to your projects, and you can open it from any computer.</p>
            <div className="row">
              <button className="ghost" onClick={() => setModal(null)}>Not now</button>
              <button onClick={() => signIn('signup')}>Create account</button>
              <button className="signin" onClick={() => signIn('login')}>Sign in</button>
            </div>
          </div>
        </div>
      )}
      {modal?.kind === 'restore' && (
        <div className="sg-modal" role="dialog" aria-modal="true" aria-labelledby="sg-r-h">
          <div className="card">
            <h3 id="sg-r-h">Pick up where you left off?</h3>
            <p>
              You have an unsaved build in this browser
              {modal.d.name ? <> called <b>{modal.d.name}</b></> : null}
              {Array.isArray(modal.d.data.modules) ? ` with ${modal.d.data.modules.length} module${modal.d.data.modules.length === 1 ? '' : 's'}` : ''}.
              {viewer ? ' Restore it and it will be saved to your projects.' : ''}
            </p>
            <div className="row">
              <button className="ghost" onClick={() => { draft.clear(); setModal(null); }}>Start fresh</button>
              <button className="signin" onClick={() => { const d = modal.d; setModal(null); api.current?.restore(d); if (viewer) draft.clear(); }}>Restore build</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AccountMenu({ viewer, onSignIn, onBeforeLeave }: { viewer: Viewer; onSignIn: () => void; onBeforeLeave: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!viewer) return <button className="signin" onClick={onSignIn}>Sign in</button>;

  const signOut = async () => {
    onBeforeLeave();
    await supabaseBrowser().auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div ref={box} style={{ display: 'contents' }}>
      <button className="acct-btn" aria-haspopup="menu" aria-expanded={open} title={viewer.name} onClick={() => setOpen(o => !o)}>
        {viewer.avatarUrl ? <img src={viewer.avatarUrl} alt="" /> : initials(viewer.name)}
      </button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-who"><b>{viewer.name}</b>{viewer.username && <span>@{viewer.username}</span>}</div>
          <Link role="menuitem" href="/projects" onClick={() => setOpen(false)}>My projects</Link>
          <a role="menuitem" href="/simulator" onClick={e => { e.preventDefault(); setOpen(false); onBeforeLeave(); location.assign('/simulator'); }}>New project</a>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)}>Profile</Link>
          <button role="menuitem" className="out" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
