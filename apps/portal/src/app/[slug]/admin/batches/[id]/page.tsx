import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDate } from '@/lib/dates';
import { now } from '@/lib/clock';
import { portalOrigin } from '@/lib/urls';
import { rosterRows } from '@/lib/students';
import type { Batch } from '@/lib/types';
import { Badge, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { AddStudents, StudentTable } from '@/ui/StudentTools';
import { assignTeacher, copyBatch, resetJoinCode, setBatchStatus, updateBatch } from '../../../staff-actions';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function BatchDetail({ params, searchParams }: PageProps<'/[slug]/admin/batches/[id]'>) {
  const { slug, id } = await params;
  const created = (await searchParams).created;
  const { institute: inst } = await pageMember(slug, ['institute_admin']);
  if (!UUID.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: batch } = await db.from('batches').select('*').eq('id', id).eq('institute_id', inst.id).maybeSingle<Batch>();
  if (!batch) notFound();
  const [{ data: bt }, { data: teachers }, { data: allBatches }, rows] = await Promise.all([
    db.from('batch_teachers').select('teacher_id, portal_users(display_name)').eq('batch_id', id),
    db.from('portal_users').select('id, display_name').eq('institute_id', inst.id).eq('role', 'teacher').eq('status', 'active').order('display_name'),
    db.from('batches').select('id, name').eq('institute_id', inst.id).eq('status', 'active').order('name'),
    rosterRows(inst.id, { batchId: id }),
  ]);
  const assigned = new Set((bt ?? []).map(r => r.teacher_id));
  const loginUrl = `${portalOrigin()}/${inst.slug}/login`.replace(/^https?:\/\//, '');
  const joinLink = `${portalOrigin()}/${inst.slug}/join/${batch.join_code}`;
  const expired = batch.join_code_expires_at && new Date(batch.join_code_expires_at) < now();

  return (
    <>
      <PageHead title={batch.name} lead={<>{batch.course || 'No course set'} · {batch.schedule_text || 'No schedule'} · {rows.length} students {batch.status === 'archived' && <Badge>archived</Badge>}</>}>
        <Link className={s.btnGhost} href={`/${inst.slug}/admin/batches`}>All batches</Link>
        <ActionForm action={copyBatch.bind(null, inst.slug)} className={s.row}><input type="hidden" name="id" value={batch.id} /><Submit className={s.btnGhost}>Copy</Submit></ActionForm>
        <ActionForm action={setBatchStatus} className={s.row} confirm={batch.status === 'active' ? 'Archive this batch? Students keep their accounts.' : undefined}><input type="hidden" name="id" value={batch.id} /><Submit className={s.btnGhost}>{batch.status === 'active' ? 'Archive' : 'Restore'}</Submit></ActionForm>
      </PageHead>
      {created && <p className={s.okBox} style={{ marginBottom: 16 }}>Batch created. Share the join code with students, or add them below.</p>}

      <div className={s.grid3} style={{ marginBottom: 16 }}>
        <div className={s.card}>
          <h2 className={s.h2}>Join code</h2>
          <p className={s.code}>{batch.join_code}</p>
          <p className={`${s.small} ${s.muted}`} style={{ wordBreak: 'break-all' }}>{joinLink}</p>
          <p className={s.small} style={{ margin: '6px 0 10px' }}>
            {batch.self_join ? <Badge tone="blue">Self-join on</Badge> : <Badge>Self-join off: existing students only</Badge>}{' '}
            {batch.join_code_expires_at && (expired ? <Badge tone="bad">expired</Badge> : <span className={s.muted}>expires {fmtDate(batch.join_code_expires_at)}</span>)}
          </p>
          <ActionForm action={resetJoinCode} confirm="Make a new code? The old one stops working.">
            <input type="hidden" name="id" value={batch.id} />
            <Field label="New code expires after"><select className={s.select} name="expires_days" defaultValue="0"><option value="0">Never</option><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></Field>
            <Submit className={`${s.btnGhost} ${s.btnSmall}`}>Reset code</Submit>
          </ActionForm>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Teachers</h2>
          <ul className={s.list}>
            {(bt ?? []).map(r => (
              <li key={r.teacher_id}>
                <span>{(r.portal_users as unknown as { display_name: string })?.display_name}</span>
                <ActionForm action={assignTeacher} className={s.row} showOk={false}>
                  <input type="hidden" name="batch_id" value={batch.id} /><input type="hidden" name="teacher_id" value={r.teacher_id} /><input type="hidden" name="remove" value="1" />
                  <Submit className={s.btnLink}>Remove</Submit>
                </ActionForm>
              </li>
            ))}
          </ul>
          {!bt?.length && <p className={s.muted}>No teacher yet.</p>}
          {(teachers ?? []).some(t => !assigned.has(t.id)) ? (
            <ActionForm action={assignTeacher} className={s.row} showOk={false}>
              <input type="hidden" name="batch_id" value={batch.id} />
              <select className={s.select} name="teacher_id" style={{ flex: 1 }}>{(teachers ?? []).filter(t => !assigned.has(t.id)).map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}</select>
              <Submit className={`${s.btnGhost} ${s.btnSmall}`}>Assign</Submit>
            </ActionForm>
          ) : <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}><Link href={`/${inst.slug}/admin/teachers`}>Invite a teacher</Link></p>}
        </div>
        <details className={`${s.card} ${s.more}`}>
          <summary className={s.h2}>Edit details</summary>
          <ActionForm action={updateBatch}>
            <input type="hidden" name="id" value={batch.id} />
            <Field label="Name"><input className={s.input} name="name" defaultValue={batch.name} required maxLength={80} /></Field>
            <Field label="Course"><input className={s.input} name="course" defaultValue={batch.course} maxLength={80} /></Field>
            <Field label="Schedule"><input className={s.input} name="schedule_text" defaultValue={batch.schedule_text} maxLength={120} /></Field>
            <div className={s.formRow}>
              <Field label="Starts"><input className={s.input} type="date" name="starts_on" defaultValue={batch.starts_on ?? ''} /></Field>
              <Field label="Ends"><input className={s.input} type="date" name="ends_on" defaultValue={batch.ends_on ?? ''} /></Field>
            </div>
            <label className={s.check}><input type="checkbox" name="self_join" defaultChecked={batch.self_join} /> <span>Students can join on their own with the code</span></label>
            <Submit>Save</Submit>
          </ActionForm>
        </details>
      </div>

      <div className={s.between} style={{ margin: '8px 0 12px' }}>
        <h2 className={s.h2} style={{ margin: 0 }}>Students</h2>
      </div>
      <div className={s.stack}>
        <AddStudents batches={allBatches ?? []} fixedBatch={{ id: batch.id, name: batch.name }} loginUrl={loginUrl} />
        <StudentTable rows={rows} batches={allBatches ?? []} currentBatch={{ id: batch.id, name: batch.name }} loginUrl={loginUrl} canArchive detailBase={`/${inst.slug}/admin/students`} />
      </div>
    </>
  );
}
