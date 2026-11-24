'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { CsvRow, Slip } from '@/lib/students';
import { addStudent, importStudentsCsv, previewStudentsCsv, resetPins, setStudentStatus, studentBatch } from '@/app/[slug]/staff-actions';
import { ActionForm, Field, Msg, Submit } from './Form';
import Slips from './Slips';
import s from './ui.module.css';

type BatchOpt = { id: string; name: string };

/* Add one student, or many from a CSV. Both end with printable login slips. */
export function AddStudents({ batches, fixedBatch, loginUrl, requireBatch, openInitially = false }: {
  batches: BatchOpt[]; fixedBatch?: BatchOpt; loginUrl: string; requireBatch?: boolean; openInitially?: boolean;
}) {
  const [slips, setSlips] = useState<Slip[] | null>(null);
  const [mode, setMode] = useState<'one' | 'csv'>('one');
  const [open, setOpen] = useState(openInitially);
  const onDone = (st: { data?: unknown }) => { const d = st.data as { slips?: Slip[] } | undefined; if (d?.slips?.length) setSlips(d.slips); };

  if (!open) return <button className={s.btn} onClick={() => setOpen(true)}>Add students</button>;
  return (
    <div className={s.card}>
      {slips && <Slips slips={slips} loginUrl={loginUrl} onClose={() => setSlips(null)} />}
      <div className={s.between} style={{ marginBottom: 14 }}>
        <div className={s.seg}>
          <button type="button" data-on={mode === 'one'} onClick={() => setMode('one')}>One student</button>
          <button type="button" data-on={mode === 'csv'} onClick={() => setMode('csv')}>Upload CSV</button>
        </div>
        <button className={s.btnLink} onClick={() => setOpen(false)}>Close</button>
      </div>
      {mode === 'one' ? (
        <ActionForm action={addStudent} resetOnOk onDone={onDone}>
          <div className={s.formRow}>
            <Field label="Student's name" hint="First name and last name, e.g. Ravi Kumar"><input className={s.input} name="name" required maxLength={80} autoComplete="off" /></Field>
            {fixedBatch ? <input type="hidden" name="batch_id" value={fixedBatch.id} /> : (
              <Field label="Batch"><select className={s.select} name="batch_id" required={requireBatch} defaultValue={batches[0]?.id ?? ''}>
                {!requireBatch && <option value="">No batch yet</option>}
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></Field>
            )}
            <Field label="Username (optional)" hint="Leave blank to use firstname-lastinitial"><input className={s.input} name="username" maxLength={30} pattern="[a-z][a-z0-9\-]{1,29}" autoComplete="off" /></Field>
          </div>
          <p className={`${s.small} ${s.muted}`}>A random 6-digit PIN is created and shown once on a printable login slip. We never ask for a student&apos;s email, phone or date of birth.</p>
          <Submit pendingText="Adding…">Add student</Submit>
        </ActionForm>
      ) : <CsvImport fixedBatch={fixedBatch} onDone={onDone} />}
    </div>
  );
}

function CsvImport({ fixedBatch, onDone }: { fixedBatch?: BatchOpt; onDone: (st: { data?: unknown }) => void }) {
  const [preview, runPreview] = useActionState(previewStudentsCsv.bind(null, fixedBatch?.id ?? null), null);
  const p = preview?.data as { rows: CsvRow[]; text: string } | undefined;
  const good = p?.rows.filter(r => !r.error).length ?? 0;
  return (
    <div className={s.stack}>
      <form action={runPreview} className={s.form}>
        <p className={s.muted}>Columns: <span className={s.mono}>name{fixedBatch ? '' : ', batch'}</span> and optionally <span className={s.mono}>username</span>. Up to 300 rows. <a href="/students-sample.csv" download>Download a sample</a>.</p>
        <input className={s.input} type="file" name="file" accept=".csv,text/csv" required />
        <Submit className={s.btnGhost} pendingText="Checking…">Check the file</Submit>
        <Msg state={preview?.error ? preview : null} />
      </form>
      {p && (
        <>
          <div className={s.cardTight} style={{ maxHeight: 360, overflow: 'auto' }}>
            <table className={s.table}>
              <thead><tr><th>Line</th><th>Name</th><th>Batch</th><th>Username</th><th>Check</th></tr></thead>
              <tbody>{p.rows.map(r => (
                <tr key={r.line} data-dim={!!r.error}>
                  <td>{r.line}</td><td>{r.name}</td><td>{r.batch || '—'}</td><td className={s.mono}>{r.username || r.suggested}</td>
                  <td>{r.error ? <span className={s.badge} data-tone="bad">{r.error}</span> : <span className={s.badge} data-tone="ok">OK</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <ActionForm action={importStudentsCsv.bind(null, fixedBatch?.id ?? null)} onDone={onDone}>
            <input type="hidden" name="text" value={p.text} />
            <Submit pendingText="Creating accounts…">{`Create ${good} student${good === 1 ? '' : 's'}${p.rows.length > good ? ` (skip ${p.rows.length - good})` : ''}`}</Submit>
          </ActionForm>
        </>
      )}
    </div>
  );
}

export type StudentRow = { id: string; display_name: string; username: string; status: string; batches: string[]; last_login_at: string | null; lastLogin: string };

/* A roster with checkboxes and bulk actions (new PINs + slips, move, remove, archive). */
export function StudentTable({ rows, batches, currentBatch, loginUrl, canArchive, detailBase }: {
  rows: StudentRow[]; batches: BatchOpt[]; currentBatch?: BatchOpt; loginUrl: string; canArchive: boolean; detailBase?: string;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [slips, setSlips] = useState<Slip[] | null>(null);
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...sel].map(id => <input key={id} type="hidden" name="id" value={id} />);
  const onPins = (st: { data?: unknown }) => { const d = st.data as { slips?: Slip[] } | undefined; if (d?.slips) { setSlips(d.slips); setSel(new Set()); } };
  const clear = () => setSel(new Set());

  return (
    <div className={s.stack}>
      {slips && <Slips slips={slips} loginUrl={loginUrl} onClose={() => setSlips(null)} />}
      {sel.size > 0 && (
        <div className={s.card} style={{ position: 'sticky', top: 64, zIndex: 5 }}>
          <div className={s.row}>
            <b>{sel.size} selected</b>
            <ActionForm action={resetPins} className={s.row} onDone={onPins} showOk={false} confirm={`Give ${sel.size} student${sel.size > 1 ? 's' : ''} a new PIN? Their old PINs stop working.`}>
              {ids}<Submit className={`${s.btn} ${s.btnSmall}`}>New PINs + print slips</Submit>
            </ActionForm>
            <ActionForm action={studentBatch} className={s.row} onDone={clear}>
              {ids}<input type="hidden" name="op" value={currentBatch ? 'move' : 'add'} />
              {currentBatch && <input type="hidden" name="from" value={currentBatch.id} />}
              <select className={s.select} name="to" style={{ width: 'auto' }} required defaultValue="">
                <option value="" disabled>{currentBatch ? 'Move to…' : 'Add to batch…'}</option>
                {batches.filter(b => b.id !== currentBatch?.id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Submit className={`${s.btnGhost} ${s.btnSmall}`}>{currentBatch ? 'Move' : 'Add'}</Submit>
            </ActionForm>
            {currentBatch && (
              <ActionForm action={studentBatch} className={s.row} onDone={clear} confirm="Remove from this batch? Their account and projects stay.">
                {ids}<input type="hidden" name="op" value="remove" /><input type="hidden" name="from" value={currentBatch.id} />
                <Submit className={`${s.btnGhost} ${s.btnSmall}`}>Remove from batch</Submit>
              </ActionForm>
            )}
            {canArchive && (
              <ActionForm action={setStudentStatus} className={s.row} onDone={clear} confirm="Archive these students? They won't be able to sign in. This month's usage count doesn't go down.">
                {ids}<input type="hidden" name="to" value="archived" />
                <Submit className={`${s.btnDanger} ${s.btnSmall}`}>Archive</Submit>
              </ActionForm>
            )}
            <button className={s.btnLink} onClick={clear}>Clear</button>
          </div>
        </div>
      )}
      <div className={s.cardTight}><div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map(r => r.id)))} /></th>
            <th>Name</th><th>Username</th><th>Batches</th><th>Last sign-in</th><th>Status</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} data-dim={r.status !== 'active'}>
              <td><input type="checkbox" aria-label={`Select ${r.display_name}`} checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
              <td>{detailBase ? <Link href={`${detailBase}/${r.id}`}>{r.display_name}</Link> : r.display_name}</td>
              <td className={s.mono}>{r.username}</td>
              <td className={s.small}>{r.batches.join(', ') || <span className={s.muted}>—</span>}</td>
              <td className={s.small}>{r.lastLogin}</td>
              <td>{r.status === 'active' ? <span className={s.badge} data-tone="ok">active</span> : <span className={s.badge}>archived</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length && <div className={s.empty}>No students here yet.</div>}
      </div></div>
    </div>
  );
}
