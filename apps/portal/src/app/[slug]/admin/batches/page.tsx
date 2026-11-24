import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Batch } from '@/lib/types';
import { Badge, Empty, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { createBatch } from '../../staff-actions';

export const metadata = { title: 'Batches · StemGrid' };

/* Batches are unlimited: there is no count limit anywhere. */
export default async function Batches({ params, searchParams }: PageProps<'/[slug]/admin/batches'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const sp = await searchParams;
  const show = sp.show === 'archived' ? 'archived' : 'active';
  const db = supabaseAdmin();
  const [{ data }, { data: bt }, { data: bs }, { data: teachers }] = await Promise.all([
    db.from('batches').select('*').eq('institute_id', inst.id).eq('status', show).order('name'),
    db.from('batch_teachers').select('batch_id, portal_users(display_name)').eq('institute_id', inst.id),
    db.from('batch_students').select('batch_id').eq('institute_id', inst.id).is('removed_at', null).limit(100000),
    db.from('portal_users').select('id, display_name').eq('institute_id', inst.id).eq('role', 'teacher').eq('status', 'active').order('display_name'),
  ]);
  const batches = (data ?? []) as Batch[];
  const tNames = new Map<string, string[]>();
  for (const r of bt ?? []) tNames.set(r.batch_id, [...(tNames.get(r.batch_id) ?? []), (r.portal_users as unknown as { display_name: string })?.display_name]);
  const counts = new Map<string, number>();
  for (const r of bs ?? []) counts.set(r.batch_id, (counts.get(r.batch_id) ?? 0) + 1);
  const b = `/${inst.slug}/admin/batches`;

  return (
    <>
      <PageHead title="Batches" lead="Create as many as you need. Each batch has its own join code.">
        <div className={s.seg}><Link href={b} data-on={show === 'active'}>Active</Link><Link href={`${b}?show=archived`} data-on={show === 'archived'}>Archived</Link></div>
      </PageHead>
      <div className={s.stack}>
        <details className={`${s.card} ${s.more}`} open={!!sp.new}>
          <summary className={s.h3}>+ New batch</summary>
          <div style={{ marginTop: 14 }}>
            <ActionForm action={createBatch.bind(null, inst.slug)}>
              <div className={s.formRow}>
                <Field label="Name"><input className={s.input} name="name" required maxLength={80} placeholder="Robotics Saturday" /></Field>
                <Field label="Course"><input className={s.input} name="course" maxLength={80} placeholder="Electronics Level 1" /></Field>
                <Field label="Schedule"><input className={s.input} name="schedule_text" maxLength={120} placeholder="Sat 10–12" /></Field>
              </div>
              <div className={s.formRow}>
                <Field label="Starts"><input className={s.input} type="date" name="starts_on" /></Field>
                <Field label="Ends"><input className={s.input} type="date" name="ends_on" /></Field>
                <Field label="Teacher"><select className={s.select} name="teacher_id" defaultValue=""><option value="">Assign later</option>{(teachers ?? []).map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}</select></Field>
              </div>
              <label className={s.check}><input type="checkbox" name="self_join" /> <span>Let students join on their own with the batch code (they pick up a username and PIN themselves)</span></label>
              <Submit>Create batch</Submit>
            </ActionForm>
          </div>
        </details>
        <div className={s.cardTight}><div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Batch</th><th>Schedule</th><th>Teachers</th><th className={s.num}>Students</th><th>Join code</th></tr></thead>
            <tbody>{batches.map(x => (
              <tr key={x.id}>
                <td><Link href={`${b}/${x.id}`}>{x.name}</Link>{x.course && <><br /><span className={`${s.small} ${s.muted}`}>{x.course}</span></>}</td>
                <td className={s.small}>{x.schedule_text || '—'}</td>
                <td className={s.small}>{tNames.get(x.id)?.join(', ') || <span className={s.muted}>None yet</span>}</td>
                <td className={s.num}>{counts.get(x.id) ?? 0}</td>
                <td><span className={s.mono}>{x.join_code}</span>{x.self_join && <> <Badge tone="blue">self-join</Badge></>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!batches.length && <Empty>{show === 'active' ? 'No batches yet. Create your first one above.' : 'No archived batches.'}</Empty>}
        </div></div>
      </div>
    </>
  );
}
