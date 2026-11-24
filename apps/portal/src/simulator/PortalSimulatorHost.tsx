'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// The engine, markup and styles are copied unchanged from apps/simulator/src/simulator by
// scripts/copy-sim.mjs (predev / prebuild), so there is one source of truth and no drift.
import { startSimulator, type Simulator } from '@/simulator/engine/engine';
import styles from '@/simulator/engine/styles';
import markup from '@/simulator/engine/markup';
import { cleanName, createProject, saveProject, uploadThumbnail, type Owner } from '@/lib/projects';
import { supabaseBrowser } from '@/lib/supabase/client';
import { initials, type BuildData } from '@/lib/types';

export type PortalViewer = { id: string; name: string; sub: string; instituteId: string; instituteName: string; role: string };
type Props = {
  slug: string;
  viewer: PortalViewer;
  project?: { id: string; name: string; data: BuildData; ownerName?: string } | null;
  readOnly?: boolean;
};

const THUMB_EVERY = 30_000;

/* Hosts the simulator engine inside the portal. Same lifecycle as the simulator app's SimulatorHost
   (inject styles, set markup, startSimulator, stop() on unmount, Strict Mode safe) and the same
   autosave rules (~1.5 s debounce, 5 s poll, retry with backoff, Ctrl/⌘+S, thumbnails at most every
   30 s and on leave), but saving to the portal's student_projects. No guest mode, no localStorage
   draft, no ?claim, no ?demo. Teachers and admins can open students' builds read-only. */
export default function PortalSimulatorHost({ slug, viewer, project, readOnly = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [acctEl, setAcctEl] = useState<HTMLElement | null>(null);
  const api = useRef<{ saveNow: () => Promise<void> } | null>(null);
  const pid = useRef<string | null>(project?.id ?? null);       // survives Strict Mode's double mount
  const creating = useRef<Promise<string> | null>(null);
  const owner: Owner = { uid: viewer.id, instituteId: viewer.instituteId };
  const home = viewer.role === 'student' ? `/${slug}/student/projects` : viewer.role === 'teacher' ? `/${slug}/teacher/batches` : `/${slug}/admin/dashboard`;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const style = document.createElement('style');
    style.dataset.stemgrid = 'simulator';
    style.textContent = styles;
    document.head.appendChild(style);
    el.innerHTML = markup;

    const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
    const stateEl = $('saveState'), nameEl = $('docName'), saveBtn = $<HTMLButtonElement>('saveBtn'), homeBtn = $<HTMLButtonElement>('homeBtn');

    let name = project?.name ?? 'Untitled build', savedName = name;
    let lastKey: string | null = null;
    let timer = 0, retryT = 0, fails = 0, lastThumb = 0, busy = false, again = false, alive = true;

    const setStatus = (st: string, text: string, title = '') => { stateEl.dataset.s = st; stateEl.textContent = text; stateEl.title = title; };
    const snap = () => {
      const d = sim.serialize();
      const { camera: _camera, ...rest } = d;
      return { d: d as BuildData, key: JSON.stringify(rest) };
    };
    const isDirty = () => snap().key !== lastKey || name !== savedName;
    const tabTitle = () => `${name} · ${viewer.instituteName}`;
    const showName = () => { nameEl.textContent = name; document.title = tabTitle(); };
    const titleObs = new MutationObserver(() => { if (document.title !== tabTitle()) document.title = tabTitle(); });
    titleObs.observe(document.head, { childList: true, subtree: true, characterData: true });

    function ensureProject(d: BuildData): Promise<string> | string {
      if (pid.current) return pid.current;
      creating.current ??= createProject(owner, name, d).then(row => {
        pid.current = row.id;
        history.replaceState(history.state, '', `/${slug}/simulator/${row.id}`);
        return row.id;
      }).finally(() => { creating.current = null; });
      return creating.current;
    }

    async function thumb(id: string) {
      const blob = await sim.snapshot();
      if (!blob) return;
      const path = await uploadThumbnail(owner, id, blob);
      await saveProject(id, { thumbnail_path: path });
      lastThumb = Date.now();
    }

    async function tick(opts: { thumb?: boolean; create?: boolean } = {}) {
      if (readOnly || !alive) return;
      clearTimeout(timer);
      const { d, key } = snap();
      const changed = key !== lastKey || name !== savedName;
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
    const poke = () => { if (readOnly) return; clearTimeout(timer); timer = window.setTimeout(() => tick(), 1500); };

    const sim: Simulator = startSimulator({ onChange: poke });

    if (project) { sim.load(project.data); lastKey = snap().key; }
    else lastKey = snap().key;
    if (readOnly) {
      setStatus('guest', `View only · ${project?.ownerName ?? 'student'}'s build`, 'Changes here are not saved.');
      saveBtn.style.display = 'none';
      nameEl.contentEditable = 'false';
    } else if (project) setStatus('saved', 'Saved');
    showName();

    const saveNow = async () => {
      if (readOnly) { sim.toast("This is a student's build: changes aren't saved."); return; }
      await tick({ thumb: true, create: true });
      if (stateEl.dataset.s === 'saved') { saveBtn.classList.add('done'); setTimeout(() => saveBtn.classList.remove('done'), 1200); }
    };
    api.current = { saveNow };

    const goHome = () => { if (!readOnly) tick({ thumb: !!pid.current }); location.assign(home); };
    homeBtn.addEventListener('click', goHome);
    homeBtn.title = 'Back to the portal';
    saveBtn.addEventListener('click', saveNow);

    const commitName = () => {
      const next = cleanName(nameEl.textContent || '');
      if (next !== name) { name = next; poke(); }
      showName();
    };
    const nameKeys = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
      if (e.key === 'Escape') { nameEl.textContent = name; nameEl.blur(); }
    };
    const namePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' '));
    };
    nameEl.addEventListener('blur', commitName);
    nameEl.addEventListener('keydown', nameKeys);
    nameEl.addEventListener('paste', namePaste);

    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); }
    };
    window.addEventListener('keydown', keys, true);

    const poll = window.setInterval(() => { if (!document.hidden && !busy) tick(); }, 5000);
    const beforeUnload = (e: BeforeUnloadEvent) => { if (!readOnly && (isDirty() || busy)) e.preventDefault(); };
    const onHide = () => { if (document.hidden) tick({ thumb: !!pid.current }); };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', onHide);

    const help = el.querySelector<HTMLDetailsElement>('#helpMenu');
    const closeHelp = (e: PointerEvent) => { if (help?.open && !help.contains(e.target as Node)) help.open = false; };
    document.addEventListener('pointerdown', closeHelp);
    setAcctEl($('acct'));

    return () => {
      if (!readOnly && pid.current) {
        const { d, key } = snap();
        if (key !== lastKey || name !== savedName) {
          const id = pid.current;
          const shot = sim.snapshot();
          saveProject(id, { data: d, name }).then(async () => {
            const b = await shot; if (b) await uploadThumbnail(owner, id, b).then(p => saveProject(id, { thumbnail_path: p }));
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

  return (
    <>
      <div ref={host} />
      {acctEl && createPortal(<AccountMenu slug={slug} viewer={viewer} home={home} onBeforeLeave={() => api.current?.saveNow()} />, acctEl)}
    </>
  );
}

function AccountMenu({ slug, viewer, home, onBeforeLeave }: { slug: string; viewer: PortalViewer; home: string; onBeforeLeave: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const go = (href: string) => { setOpen(false); onBeforeLeave(); location.assign(href); };
  const signOut = async () => {
    onBeforeLeave();
    await supabaseBrowser().auth.signOut({ scope: 'local' });
    location.assign(`/${slug}/login`);
  };
  return (
    <div ref={box} style={{ display: 'contents' }}>
      <button className="acct-btn" aria-haspopup="menu" aria-expanded={open} title={viewer.name} onClick={() => setOpen(o => !o)}>{initials(viewer.name)}</button>
      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-who"><b>{viewer.name}</b><span>{viewer.sub} · {viewer.instituteName}</span></div>
          <a role="menuitem" href={home} onClick={e => { e.preventDefault(); go(home); }}>Back to portal</a>
          {viewer.role === 'student' && <a role="menuitem" href={`/${slug}/student/projects`} onClick={e => { e.preventDefault(); go(`/${slug}/student/projects`); }}>My projects</a>}
          <a role="menuitem" href={`/${slug}/simulator`} onClick={e => { e.preventDefault(); go(`/${slug}/simulator`); }}>New build</a>
          <button role="menuitem" className="out" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
