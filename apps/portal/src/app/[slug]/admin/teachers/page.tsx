import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { teacherLimit } from '@/lib/pricing';
import { now } from '@/lib/clock';
import { fmtDate, fmtDateTime } from '@/lib/dates';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { Badge, Empty, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { inviteStaff, revokeInvite, setStaffStatus } from '../../staff-actions';

export const metadata = { title: 'Teachers · StemGrid' };

export default async function Teachers({ params }: PageProps<'/[slug]/admin/teachers'>) {
  const { user: me, institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const db = supabaseAdmin();
  const [{ data: people }, { data: invites }, { data: bt }, { data: batches }, limit] = await Promise.all([
    db.from('portal_users').select('*').eq('institute_id', inst.id).neq('role', 'student').order('role').order('display_name'),
    db.from('invites').select('*').eq('institute_id', inst.id).is('used_at', null).is('revoked_at', null).gt('expires_at', now().toISOString()).order('created_at', { ascending: false }),
    db.from('batch_teachers').select('teacher_id, batches(name, status)').eq('institute_id', inst.id),
    db.from('batches').select('id, name').eq('institute_id', inst.id).eq('status', 'active').order('name'),
    teacherLimit(inst.id),
  ]);
  const teaching = new Map<string, string[]>();
  for (const r of bt ?? []) { const b = r.batches as unknown as { name: string; status: string }; if (b?.status === 'active') teaching.set(r.teacher_id, [...(teaching.get(r.teacher_id) ?? []), b.name]); }
  const activeTeachers = (people ?? []).filter(p => p.role === 'teacher' && p.status === 'active').length;
  const pendingTeachers = (invites ?? []).filter(i => i.role === 'teacher').length;

  return (
    <>
      <PageHead title="Teachers and admins" lead={limit == null
        ? `${activeTeachers} active teachers. Teacher accounts aren't limited during your free period.`
        : `${activeTeachers} of ${limit} teacher accounts in use${pendingTeachers ? ` (+${pendingTeachers} invited)` : ''}.`} />
      <div className={s.grid2}>
        <div className={s.stack}>
          <div className={s.cardTight}><div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Name</th><th>Role</th><th>Batches</th><th>Last sign-in</th><th /></tr></thead>
              <tbody>{(people ?? []).map(p => (
                <tr key={p.id} data-dim={p.status !== 'active'}>
                  <td>{p.display_name}<br /><span className={`${s.small} ${s.muted}`}>{p.email}</span></td>
                  <td><Badge tone={p.role === 'institute_admin' ? 'red' : undefined}>{ROLE_LABEL[p.role as Role]}</Badge>{p.status !== 'active' && <> <Badge>deactivated</Badge></>}</td>
                  <td className={s.small}>{teaching.get(p.id)?.join(', ') || '—'}</td>
                  <td className={s.small}>{p.last_login_at ? fmtDateTime(p.last_login_at) : 'Never'}</td>
                  <td>{p.id !== me.id && (
                    <ActionForm action={setStaffStatus} className={s.row} confirm={p.status === 'active' ? `Deactivate ${p.display_name}? They won't be able to sign in.` : undefined}>
                      <input type="hidden" name="id" value={p.id} />
                      <Submit className={`${s.btnGhost} ${s.btnSmall}`}>{p.status === 'active' ? 'Deactivate' : 'Reactivate'}</Submit>
                    </ActionForm>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div></div>
          {!!invites?.length && (
            <div className={s.card}>
              <h2 className={s.h2}>Pending invites</h2>
              <ul className={s.list}>{invites.map(i => (
                <li key={i.token_hash}>
                  <span>{i.email} <span className={s.muted}>· {ROLE_LABEL[i.role as Role]} · expires {fmtDate(i.expires_at)}</span></span>
                  <ActionForm action={revokeInvite} className={s.row} showOk={false}><input type="hidden" name="token_hash" value={i.token_hash} /><Submit className={s.btnLink}>Cancel</Submit></ActionForm>
                </li>
              ))}</ul>
            </div>
          )}
          {!people?.length && <Empty>No teachers yet.</Empty>}
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Invite someone</h2>
          <ActionForm action={inviteStaff} resetOnOk>
            <Field label="Email"><input className={s.input} type="email" name="email" required /></Field>
            <Field label="Name (optional)"><input className={s.input} name="name" maxLength={80} /></Field>
            <div className={s.formRow}>
              <Field label="Role"><select className={s.select} name="role" defaultValue="teacher"><option value="teacher">Teacher</option><option value="institute_admin">Admin</option></select></Field>
              <Field label="Batch (teachers)"><select className={s.select} name="batch_id" defaultValue=""><option value="">Assign later</option>{(batches ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            </div>
            <p className={`${s.small} ${s.muted}`}>They get an email with a link to set their password. The link works once and expires in 7 days.</p>
            <Submit>Send invite</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
