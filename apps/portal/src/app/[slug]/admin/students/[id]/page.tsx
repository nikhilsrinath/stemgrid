import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmtDateTime, fmtMonth } from '@/lib/dates';
import { portalOrigin } from '@/lib/urls';
import { Badge, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import StudentPin from '@/ui/StudentPin';
import { renameStudent, setStudentStatus, studentBatch } from '../../../staff-actions';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function StudentDetail({ params }: PageProps<'/[slug]/admin/students/[id]'>) {
  const { slug, id } = await params;
  const { institute: inst } = await pageMember(slug, ['institute_admin']);
  if (!UUID.test(id)) notFound();
  const db = supabaseAdmin();
  const { data: st } = await db.from('portal_users').select('*').eq('id', id).eq('institute_id', inst.id).eq('role', 'student').maybeSingle();
  if (!st) notFound();
  const [{ data: links }, { data: batches }, { data: projects }, { data: months }] = await Promise.all([
    db.from('batch_students').select('batch_id, joined_at, joined_via, batches(name, status)').eq('student_id', id).is('removed_at', null),
    db.from('batches').select('id, name').eq('institute_id', inst.id).eq('status', 'active').order('name'),
    db.from('student_projects').select('id, name, module_count, updated_at').eq('owner_id', id).order('updated_at', { ascending: false }).limit(50),
    db.from('monthly_active_students').select('month').eq('student_id', id).eq('institute_id', inst.id).order('month', { ascending: false }).limit(12),
  ]);
  const inBatch = new Set((links ?? []).map(l => l.batch_id));
  const loginUrl = `${portalOrigin()}/${inst.slug}/login`.replace(/^https?:\/\//, '');

  return (
    <>
      <PageHead title={st.display_name} lead={<><span className={s.mono}>{st.username}</span> · last sign-in {st.last_login_at ? fmtDateTime(st.last_login_at) : 'never'} {st.status !== 'active' && <Badge>archived</Badge>}</>}>
        <Link className={s.btnGhost} href={`/${inst.slug}/admin/students`}>All students</Link>
      </PageHead>
      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>Sign-in</h2>
            <p className={s.muted} style={{ marginBottom: 12 }}>PINs are never stored where anyone can read them. If {st.display_name.split(' ')[0]} forgets theirs, give a new one.</p>
            <StudentPin studentId={st.id} loginUrl={loginUrl} />
          </div>
          <div className={s.card}>
            <h2 className={s.h2}>Batches</h2>
            <ul className={s.list}>{(links ?? []).map(l => (
              <li key={l.batch_id}>
                <span>{(l.batches as unknown as { name: string })?.name} <span className={`${s.small} ${s.muted}`}>· joined {fmtDateTime(l.joined_at)} ({l.joined_via})</span></span>
                <ActionForm action={studentBatch} className={s.row} showOk={false}>
                  <input type="hidden" name="id" value={st.id} /><input type="hidden" name="op" value="remove" /><input type="hidden" name="from" value={l.batch_id} />
                  <Submit className={s.btnLink}>Remove</Submit>
                </ActionForm>
              </li>
            ))}</ul>
            {!links?.length && <p className={s.muted}>Not in any batch.</p>}
            {(batches ?? []).some(b => !inBatch.has(b.id)) && (
              <ActionForm action={studentBatch} className={s.row} showOk={false}>
                <input type="hidden" name="id" value={st.id} /><input type="hidden" name="op" value="add" />
                <select className={s.select} name="to" style={{ flex: 1 }}>{(batches ?? []).filter(b => !inBatch.has(b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                <Submit className={`${s.btnGhost} ${s.btnSmall}`}>Add to batch</Submit>
              </ActionForm>
            )}
          </div>
          <div className={s.card}>
            <h2 className={s.h2}>Details</h2>
            <ActionForm action={renameStudent}>
              <input type="hidden" name="id" value={st.id} />
              <Field label="Display name"><input className={s.input} name="name" defaultValue={st.display_name} maxLength={80} required /></Field>
              <Submit className={s.btnGhost}>Save</Submit>
            </ActionForm>
            <hr className={s.divider} style={{ margin: '14px 0' }} />
            <ActionForm action={setStudentStatus} confirm={st.status === 'active' ? 'Archive this student? They will not be able to sign in.' : undefined}>
              <input type="hidden" name="id" value={st.id} /><input type="hidden" name="to" value={st.status === 'active' ? 'archived' : 'active'} />
              <Submit className={st.status === 'active' ? s.btnDanger : s.btnGhost}>{st.status === 'active' ? 'Archive student' : 'Restore student'}</Submit>
            </ActionForm>
          </div>
        </div>
        <div className={s.stack}>
          <div className={s.card}>
            <h2 className={s.h2}>Projects</h2>
            <ul className={s.list}>{(projects ?? []).map(p => (
              <li key={p.id}><Link href={`/${inst.slug}/simulator/${p.id}`}>{p.name}</Link><span className={`${s.small} ${s.muted}`}>{p.module_count} modules · {fmtDateTime(p.updated_at)}</span></li>
            ))}</ul>
            {!projects?.length && <p className={s.muted}>No saved builds yet.</p>}
          </div>
          <div className={s.card}>
            <h2 className={s.h2}>Active months</h2>
            <p className={s.muted}>{(months ?? []).map(m => fmtMonth(m.month)).join(', ') || 'Not counted yet.'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
