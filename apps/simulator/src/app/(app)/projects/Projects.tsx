'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createProject, deleteProject, duplicateProject, renameProject, cleanName } from '@/lib/projects';
import { thumbUrl, type ProjectSummary } from '@/lib/types';
import s from '@/ui/ui.module.css';

type Sort = 'updated' | 'name' | 'created';

function ago(iso: string, now: number) {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  if (sec < 604800) { const d = Math.floor(sec / 86400); return d === 1 ? 'yesterday' : `${d} days ago`; }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: sec > 31536000 ? 'numeric' : undefined });
}

export default function Projects({ uid, firstName, initial, loadError, notice, renderedAt }: {
  uid: string; firstName: string; initial: ProjectSummary[]; loadError: boolean; notice?: string; renderedAt: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(notice ?? '');
  const [confirm, setConfirm] = useState<ProjectSummary | null>(null);
  const [now, setNow] = useState(renderedAt);   // the server's clock first, so hydration matches

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);   // keep "x min ago" fresh
  useEffect(() => { setItems(initial); }, [initial]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? items.filter(p => p.name.toLowerCase().includes(needle)) : [...items];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'created') list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === 'updated') list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [items, q, sort]);

  const fail = (e: unknown) => setToast(e instanceof Error ? e.message : 'Something went wrong.');

  const newProject = async () => {
    setCreating(true);
    try { const p = await createProject(); router.push(`/simulator/${p.id}`); }
    catch (e) { fail(e); setCreating(false); }
  };
  const rename = async (p: ProjectSummary, name: string) => {
    const clean = cleanName(name);
    if (clean === p.name) return;
    setItems(list => list.map(x => (x.id === p.id ? { ...x, name: clean, updated_at: new Date().toISOString() } : x)));
    try { await renameProject(p.id, clean); } catch (e) { fail(e); setItems(list => list.map(x => (x.id === p.id ? p : x))); }
  };
  const duplicate = async (p: ProjectSummary) => {
    try { const c = await duplicateProject(p.id, uid); setItems(list => [c, ...list]); setToast(`Made a copy of “${p.name}”.`); }
    catch (e) { fail(e); }
  };
  const remove = async (p: ProjectSummary) => {
    setConfirm(null);
    const before = items;
    setItems(list => list.filter(x => x.id !== p.id));
    try { await deleteProject(p.id, uid); setToast(`Deleted “${p.name}”.`); router.refresh(); }
    catch (e) { fail(e); setItems(before); }
  };

  return (
    <>
      <div className={s.head}>
        <div>
          <h1 className={s.h2}>Projects</h1>
          <p className={s.lead}>Welcome back, {firstName}. {items.length ? `${items.length} build${items.length === 1 ? '' : 's'}, saved as you go.` : 'Your builds save here as you go.'}</p>
        </div>
        <div className={s.tools}>
          {items.length > 0 && (<>
            <label className={s.search}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
              <span className={s.srOnly}>Search projects</span>
              <input className={s.input} type="search" placeholder="Search projects" value={q} onChange={e => setQ(e.target.value)} />
            </label>
            <label>
              <span className={s.srOnly}>Sort by</span>
              <select className={s.select} value={sort} onChange={e => setSort(e.target.value as Sort)}>
                <option value="updated">Last edited</option>
                <option value="created">Newest</option>
                <option value="name">Name</option>
              </select>
            </label>
          <button className={s.btn} onClick={newProject} disabled={creating}>
            {creating ? <span className={s.spinner} aria-hidden="true" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>}
            New project
          </button>
          </>)}
        </div>
      </div>

      {loadError && <div className={s.error} role="alert" style={{ marginBottom: 20 }}>Couldn&apos;t load your projects. Reload the page to try again.</div>}

      {items.length === 0 && !loadError ? (
        <div className={s.empty}>
          <EmptyArt />
          <h3>No projects yet</h3>
          <p>Drop a base plate on the table, add a Quark C3 and a sensor, wire them with Zap connectors and write your first program.</p>
          <button className={s.btn} onClick={newProject} disabled={creating}>
            {creating && <span className={s.spinner} aria-hidden="true" />}Build your first circuit
          </button>
        </div>
      ) : (
        <div className={s.grid}>
          {shown.map(p => (
            <Card key={p.id} p={p} now={now} onRename={n => rename(p, n)} onDuplicate={() => duplicate(p)} onDelete={() => setConfirm(p)} />
          ))}
          {shown.length === 0 && <p className={s.lead}>No projects match “{q}”.</p>}
        </div>
      )}

      {confirm && (
        <div className={s.modalBg} role="dialog" aria-modal="true" aria-labelledby="del-h" onPointerDown={e => e.target === e.currentTarget && setConfirm(null)}>
          <div className={s.modal}>
            <h3 id="del-h">Delete this project?</h3>
            <p><b>{confirm.name}</b> and its code will be gone for good. This can&apos;t be undone.</p>
            <div className={s.actions}>
              <button className={`${s.btn} ${s.btnLight} ${s.btnSm}`} onClick={() => setConfirm(null)} autoFocus>Keep it</button>
              <button className={`${s.btn} ${s.btnRed} ${s.btnSm}`} onClick={() => remove(confirm)}>Delete project</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </>
  );
}

function Card({ p, now, onRename, onDuplicate, onDelete }: { p: ProjectSummary; now: number; onRename: (n: string) => void; onDuplicate: () => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const src = thumbUrl(p.thumbnail_path, p.updated_at);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const href = `/simulator/${p.id}`;
  return (
    <article className={s.pcard}>
      <Link href={href} className={s.thumb} tabIndex={-1} aria-hidden="true">
        {src ? <img src={src} alt="" loading="lazy" /> : <span className={s.thumbEmpty}>Empty table</span>}
      </Link>
      <div className={s.pbody}>
        <div className={s.pmeta}>
          {editing ? (
            <input
              className={s.renameInput} defaultValue={p.name} maxLength={80} autoFocus aria-label="Project name"
              onFocus={e => e.target.select()}
              onBlur={e => { setEditing(false); onRename(e.target.value); }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { (e.target as HTMLInputElement).value = p.name; (e.target as HTMLInputElement).blur(); }
              }}
            />
          ) : (
            <Link href={href} className={s.pname} title={p.name}>{p.name}</Link>
          )}
          <div className={s.pinfo}>
            <span>Edited {ago(p.updated_at, now)}</span>
            <span className={s.chip}>{p.module_count} module{p.module_count === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className={s.menuWrap} ref={box}>
          <button className={s.kebab} aria-label={`Options for ${p.name}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
          {menu && (
            <div className={s.menu} role="menu" style={{ bottom: 'calc(100% + 6px)', top: 'auto', right: 0 }}>
              <Link role="menuitem" href={href}>Open</Link>
              <button role="menuitem" onClick={() => { setMenu(false); setEditing(true); }}>Rename</button>
              <button role="menuitem" onClick={() => { setMenu(false); onDuplicate(); }}>Duplicate</button>
              <button role="menuitem" className={s.danger} onClick={() => { setMenu(false); onDelete(); }}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyArt() {
  return (
    <svg viewBox="0 0 168 104" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="167" height="103" rx="12" fill="#FAFAFA" stroke="#E4E4E7" />
      {Array.from({ length: 6 }, (_, r) => Array.from({ length: 10 }, (_, c) => (
        <circle key={`${r}-${c}`} cx={16 + c * 15.1} cy={14 + r * 15.2} r="2.2" fill="#E4E4E7" />
      )))}
      <rect x="22" y="28" width="52" height="44" rx="6" fill="#fff" stroke="#D4D4D8" />
      <rect x="30" y="36" width="20" height="13" rx="2" fill="#18181B" />
      <circle cx="62" cy="40" r="3" fill="#E4121B" />
      <circle cx="62" cy="52" r="3" fill="#D4D4D8" />
      <rect x="104" y="36" width="44" height="28" rx="6" fill="#fff" stroke="#D4D4D8" />
      <circle cx="117" cy="50" r="6" fill="#F4F4F5" stroke="#D4D4D8" />
      <circle cx="135" cy="50" r="6" fill="#F4F4F5" stroke="#D4D4D8" />
      <path d="M74 62c14 0 16-8 30-8" stroke="#E4121B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
