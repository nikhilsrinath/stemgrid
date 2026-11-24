import { supabaseAdmin } from '@/lib/supabase/admin';
import { pageStaff } from '@/lib/auth';
import { fmtDate } from '@/lib/dates';
import { Badge, PageHead, s } from '@/ui/bits';
import { ActionForm, Field, Submit } from '@/ui/Form';
import { addStaff, toggleStaff } from '../../actions';

export default async function Team() {
  const me = await pageStaff();
  const { data } = await supabaseAdmin().from('staff_users').select('*').order('created_at');
  return (
    <>
      <PageHead title="Team" lead="StemGrid staff who can use this console. Everyone signs in with a password and an authenticator app." />
      <div className={s.grid2}>
        <div className={s.cardTight}>
          <table className={s.table}>
            <thead><tr><th>Name</th><th>Email</th><th>Since</th><th>Status</th><th /></tr></thead>
            <tbody>{(data ?? []).map(u => (
              <tr key={u.id} data-dim={!u.active}>
                <td>{u.name}{u.id === me.id && ' (you)'}</td><td>{u.email}</td><td>{fmtDate(u.created_at)}</td>
                <td><Badge tone={u.active ? 'ok' : 'bad'}>{u.active ? 'active' : 'inactive'}</Badge></td>
                <td>{u.id !== me.id && (
                  <ActionForm action={toggleStaff} className={s.row} showOk={false}>
                    <input type="hidden" name="id" value={u.id} />
                    <Submit className={`${s.btnGhost} ${s.btnSmall}`}>{u.active ? 'Deactivate' : 'Activate'}</Submit>
                  </ActionForm>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className={s.card}>
          <h2 className={s.h2}>Add a staff member</h2>
          <ActionForm action={addStaff} resetOnOk>
            <Field label="Name"><input className={s.input} name="name" required /></Field>
            <Field label="Email"><input className={s.input} type="email" name="email" required /></Field>
            <Field label="Temporary password" hint="At least 12 characters. They set up their authenticator app at first sign-in.">
              <input className={s.input} type="text" name="password" minLength={12} required autoComplete="off" />
            </Field>
            <Submit>Add staff member</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
