import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity, type Actor } from '@/lib/activity';
import { now } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { parseCsv } from '@/lib/csv';
import { USERNAME_RE, dedupeUsername, newPin, pinPassword, studentEmail, usernameBase } from '@/lib/rules';
import { UserError, type Ctx } from '@/lib/auth';
import type { Batch, Institute } from '@/lib/types';

/* A login slip: shown once, printed, never stored (we keep only the PIN's hash in Supabase Auth). */
export type Slip = { name: string; username: string; pin: string; batch?: string | null };

const db = () => supabaseAdmin();

async function takenUsernames(instituteId: string) {
  const { data } = await db().from('portal_users').select('username').eq('institute_id', instituteId).not('username', 'is', null).limit(100000);
  return new Set((data ?? []).map(r => String(r.username).toLowerCase()));
}

/* Batches this person may manage: admins all of the institute's, teachers only those they teach. */
export async function manageableBatches(ctx: Ctx, includeArchived = false): Promise<Batch[]> {
  let q = db().from('batches').select('*').eq('institute_id', ctx.institute.id).order('name');
  if (!includeArchived) q = q.eq('status', 'active');
  if (ctx.user.role === 'teacher') {
    const { data: mine } = await db().from('batch_teachers').select('batch_id').eq('teacher_id', ctx.user.id);
    const ids = (mine ?? []).map(r => r.batch_id);
    if (!ids.length) return [];
    q = q.in('id', ids);
  }
  const { data } = await q;
  return (data ?? []) as Batch[];
}

export async function assertCanManageBatch(ctx: Ctx, batchId: string) {
  const { data: b } = await db().from('batches').select('*').eq('id', batchId).eq('institute_id', ctx.institute.id).maybeSingle<Batch>();
  if (!b) throw new UserError('That batch is not in your institute.');
  if (ctx.user.role === 'teacher') {
    const { data: t } = await db().from('batch_teachers').select('batch_id').eq('batch_id', batchId).eq('teacher_id', ctx.user.id).maybeSingle();
    if (!t) throw new UserError('You can only manage your own batches.');
  } else if (ctx.user.role !== 'institute_admin') throw new UserError("You don't have access to that.");
  return b;
}

/* Admins: any student of the institute. Teachers: students currently in one of their batches. */
export async function assertCanManageStudent(ctx: Ctx, studentId: string) {
  const { data: st } = await db().from('portal_users').select('*').eq('id', studentId).eq('institute_id', ctx.institute.id).eq('role', 'student').maybeSingle();
  if (!st) throw new UserError('That student is not in your institute.');
  if (ctx.user.role === 'teacher') {
    const { data: rows } = await db().from('batch_students').select('batch_id').eq('student_id', studentId).is('removed_at', null);
    const ids = (rows ?? []).map(r => r.batch_id);
    const { data: t } = ids.length ? await db().from('batch_teachers').select('batch_id').eq('teacher_id', ctx.user.id).in('batch_id', ids).limit(1) : { data: [] };
    if (!t?.length) throw new UserError('You can only manage students in your own batches.');
  } else if (ctx.user.role !== 'institute_admin') throw new UserError("You don't have access to that.");
  return st as { id: string; display_name: string; username: string; status: string };
}

export async function createStudents(inst: Institute, rows: { name: string; username?: string; batchId: string | null; batchName?: string | null }[], via: 'added' | 'csv' | 'self', actor: Actor, createdBy: string | null): Promise<Slip[]> {
  const taken = await takenUsernames(inst.id);
  const plan = rows.map(r => {
    const want = r.username?.toLowerCase().trim();
    if (want && !USERNAME_RE.test(want)) throw new UserError(`"${want}" isn't a valid username (lowercase letters, digits and hyphens, starting with a letter).`);
    if (want && taken.has(want)) throw new UserError(`The username "${want}" is already taken.`);
    const username = want || dedupeUsername(usernameBase(r.name), taken);
    taken.add(username);
    return { ...r, username, pin: newPin() };
  });

  const slips: Slip[] = [];
  const failures: string[] = [];
  for (let i = 0; i < plan.length; i += 8) {
    await Promise.all(plan.slice(i, i + 8).map(async p => {
      const { data, error } = await db().auth.admin.createUser({
        email: studentEmail(p.username, inst.id), password: pinPassword(p.pin), email_confirm: true,
        user_metadata: { kind: 'student' }, app_metadata: { institute_id: inst.id },
      });
      if (error || !data.user) { failures.push(`${p.name}: ${error?.message ?? 'not created'}`); return; }
      const { error: e2 } = await db().from('portal_users').insert({ id: data.user.id, institute_id: inst.id, role: 'student', display_name: p.name, username: p.username, created_by: createdBy });
      if (e2) { await db().auth.admin.deleteUser(data.user.id); failures.push(`${p.name}: ${e2.message}`); return; }
      if (p.batchId) await db().from('batch_students').insert({ batch_id: p.batchId, student_id: data.user.id, institute_id: inst.id, joined_via: via, joined_at: now().toISOString() });
      slips.push({ name: p.name, username: p.username, pin: p.pin, batch: p.batchName ?? null });
    }));
  }
  if (slips.length) await logActivity({ actor, action: via === 'self' ? 'student.self_joined' : 'students.created', instituteId: inst.id, targetType: 'portal_user', after: { count: slips.length, via, usernames: slips.slice(0, 50).map(s => s.username) } });
  if (failures.length && !slips.length) throw new UserError(`Couldn't create: ${failures.slice(0, 3).join('; ')}`);
  return slips;
}

export async function resetPin(inst: Institute, student: { id: string; display_name: string; username: string }, actor: Actor): Promise<Slip> {
  const pin = newPin();
  const { error } = await db().auth.admin.updateUserById(student.id, { password: pinPassword(pin) });
  if (error) throw new UserError(error.message);
  // a new PIN also lifts a lockout
  await db().from('login_attempts').delete().eq('institute_id', inst.id).eq('username', student.username).eq('success', false).gte('attempted_at', addDays(now(), -1).toISOString());
  await logActivity({ actor, action: 'student.pin_reset', instituteId: inst.id, targetType: 'portal_user', targetId: student.id });
  return { name: student.display_name, username: student.username, pin };
}

/* ---------------------------------------------------------------- CSV: name, batch[, username] */
export type CsvRow = { line: number; name: string; batch: string; username: string; batchId: string | null; error: string | null; suggested: string };

export async function previewCsv(ctx: Ctx, text: string, fixedBatch?: Batch): Promise<CsvRow[]> {
  const rows = parseCsv(text);
  if (!rows.length) throw new UserError('The file is empty.');
  const head = rows[0].map(c => c.trim().toLowerCase());
  const hasHeader = head.includes('name');
  const ni = hasHeader ? head.indexOf('name') : 0;
  const bi = hasHeader ? head.indexOf('batch') : 1;
  const ui = hasHeader ? head.indexOf('username') : 2;
  const body = hasHeader ? rows.slice(1) : rows;
  if (body.length > 300) throw new UserError('Upload at most 300 students at a time.');
  const batches = fixedBatch ? [fixedBatch] : await manageableBatches(ctx);
  const byName = new Map(batches.map(b => [b.name.trim().toLowerCase(), b]));
  const taken = await takenUsernames(ctx.institute.id);
  return body.map((r, i) => {
    const name = (r[ni] ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const batch = fixedBatch ? fixedBatch.name : (bi >= 0 ? (r[bi] ?? '').trim() : '');
    const username = (ui >= 0 ? (r[ui] ?? '') : '').trim().toLowerCase();
    let error: string | null = null;
    const b = fixedBatch ?? (batch ? byName.get(batch.toLowerCase()) : undefined);
    if (!name) error = 'Name is missing';
    else if (batch && !b) error = `No batch called "${batch}"${ctx.user.role === 'teacher' ? ' among your batches' : ''}`;
    else if (!b && ctx.user.role === 'teacher') error = 'Batch is missing';
    else if (username && !USERNAME_RE.test(username)) error = 'Username: lowercase letters, digits, hyphens';
    else if (username && taken.has(username)) error = 'Username already taken';
    const suggested = error ? '' : username || dedupeUsername(usernameBase(name), taken);
    if (suggested) taken.add(suggested);
    return { line: i + (hasHeader ? 2 : 1), name, batch: b?.name ?? batch, username, batchId: b?.id ?? null, error, suggested };
  });
}

/* Rows for StudentTable. Admin: whole institute (optionally one batch). Teacher: one of their batches. */
export async function rosterRows(instituteId: string, opts: { batchId?: string; q?: string; status?: string; batchIds?: string[] }) {
  const { fmtDateTime } = await import('@/lib/dates');
  let ids: string[] | null = null;
  if (opts.batchId || opts.batchIds) {
    let q = db().from('batch_students').select('student_id').is('removed_at', null);
    q = opts.batchId ? q.eq('batch_id', opts.batchId) : q.in('batch_id', opts.batchIds!.length ? opts.batchIds! : ['00000000-0000-0000-0000-000000000000']);
    const { data } = await q.limit(5000);
    ids = [...new Set((data ?? []).map(r => r.student_id))];
    if (!ids.length) return [];
  }
  let q = db().from('portal_users').select('id, display_name, username, status, last_login_at').eq('institute_id', instituteId).eq('role', 'student').order('display_name').limit(2000);
  if (ids) q = q.in('id', ids);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.q) { const t = opts.q.replace(/[%_,()]/g, ''); q = q.or(`display_name.ilike.%${t}%,username.ilike.%${t}%`); }
  const { data: users } = await q;
  const list = users ?? [];
  if (!list.length) return [];
  const { data: links } = await db().from('batch_students').select('student_id, batches(name, status)').in('student_id', list.map(u => u.id)).is('removed_at', null);
  const names = new Map<string, string[]>();
  for (const l of links ?? []) {
    const b = l.batches as unknown as { name: string; status: string } | null;
    if (b && b.status === 'active') names.set(l.student_id, [...(names.get(l.student_id) ?? []), b.name]);
  }
  return list.map(u => ({ ...u, username: u.username as string, batches: names.get(u.id) ?? [], lastLogin: u.last_login_at ? fmtDateTime(u.last_login_at) : 'Never' }));
}
