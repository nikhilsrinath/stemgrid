'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteProject, duplicateProject, saveProject, type Owner } from '@/lib/projects';
import s from './ui.module.css';

type P = { id: string; name: string; modules: number; updated: string; thumb: string | null };

export default function Projects({ slug, owner, projects }: { slug: string; owner: Owner; projects: P[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id); setErr(null);
    try { await fn(); router.refresh(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  if (!projects.length) return <div className={s.card}><div className={s.empty}>No builds yet. <Link href={`/${slug}/simulator`}>Start your first one</Link>.</div></div>;
  return (
    <>
      {err && <p className={s.badBox} style={{ marginBottom: 12 }}>{err}</p>}
      <div className={s.projects}>
        <Link href={`/${slug}/simulator`} className={s.project} style={{ textDecoration: 'none', placeContent: 'center', minHeight: 200, display: 'grid', textAlign: 'center' }}>
          <b style={{ fontSize: 28, color: 'var(--red)' }}>+</b><b>New build</b>
        </Link>
        {projects.map(p => (
          <div key={p.id} className={s.project} aria-busy={busy === p.id}>
            <Link href={`/${slug}/simulator/${p.id}`} className={s.thumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.thumb ? <img src={p.thumb} alt="" /> : 'No picture yet'}
            </Link>
            <div className={s.projectBody}>
              <Link href={`/${slug}/simulator/${p.id}`} style={{ textDecoration: 'none' }}><b>{p.name}</b></Link>
              <span className={`${s.small} ${s.muted}`}>{p.modules} modules · {p.updated}</span>
              <div className={s.row}>
                <button className={s.btnLink} disabled={!!busy} onClick={() => { const n = prompt('New name', p.name); if (n && n.trim()) run(p.id, () => saveProject(p.id, { name: n })); }}>Rename</button>
                <button className={s.btnLink} disabled={!!busy} onClick={() => run(p.id, () => duplicateProject(owner, p.id))}>Duplicate</button>
                <button className={s.btnLink} disabled={!!busy} onClick={() => { if (confirm(`Delete "${p.name}"? This can't be undone.`)) run(p.id, () => deleteProject(owner, p.id)); }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
