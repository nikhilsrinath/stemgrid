'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { act, assertWritable, requireMember, UserError, type Ctx } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { now } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { EMAIL_RE, cleanText, newJoinCode } from '@/lib/rules';
import { newToken, hashToken } from '@/lib/tokens';
import { sendMail } from '@/lib/mail';
import { emails } from '@/lib/emails';
import { portalOrigin } from '@/lib/urls';
import { teacherLimit } from '@/lib/pricing';
import { confirmPlan } from '@/lib/lifecycle';
import { assertCanManageBatch, assertCanManageStudent, createStudents, previewCsv, resetPin, type Slip } from '@/lib/students';
import { ROLE_LABEL, type FormState } from '@/lib/types';

const db = () => supabaseAdmin();
const done = (ok = 'Saved.') => { revalidatePath('/', 'layout'); return { ok }; };
const str = (fd: FormData, k: string, max = 200) => cleanText(fd.get(k), max);

async function admin() { const c = await requireMember(['institute_admin']); assertWritable(c.institute); return c; }
async function staff() { const c = await requireMember(['institute_admin', 'teacher']); assertWritable(c.institute); return c; }

async function uniqueJoinCode() {
  for (let i = 0; i < 20; i++) {
    const code = newJoinCode();
    const { data } = await db().from('batches').select('id').eq('join_code', code).maybeSingle();
    if (!data) return code;
  }
  throw new UserError('Could not make a join code. Try again.');
}

const dateOrNull = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/* ---------------------------------------------------------------- batches (unlimited) */
function batchFields(fd: FormData) {
  const name = str(fd, 'name', 80);
  if (!name) throw new UserError('Give the batch a name.');
  const starts = dateOrNull(str(fd, 'starts_on', 10)), ends = dateOrNull(str(fd, 'ends_on', 10));
  if (starts && ends && ends < starts) throw new UserError('The end date is before the start date.');
  return { name, course: str(fd, 'course', 80), schedule_text: str(fd, 'schedule_text', 120), starts_on: starts, ends_on: ends, self_join: fd.get('self_join') === 'on' };
}

export async function createBatch(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const f = batchFields(fd);
    const { data, error } = await db().from('batches').insert({ ...f, institute_id: c.institute.id, join_code: await uniqueJoinCode(), created_by: c.user.id }).select('id').single();
    if (error) throw new UserError(error.message);
    const teacher = str(fd, 'teacher_id', 40);
    if (teacher) await addTeacherRow(c, data.id, teacher);
    await logActivity({ actor: c.actor, action: 'batch.created', instituteId: c.institute.id, targetType: 'batch', targetId: data.id, after: f });
    redirect(`/${slug}/admin/batches/${data.id}?created=1`);
  });
}

export async function updateBatch(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const id = str(fd, 'id', 40);
    const b = await assertCanManageBatch(c, id);
    const f = batchFields(fd);
    await db().from('batches').update(f).eq('id', id);
    await logActivity({ actor: c.actor, action: 'batch.updated', instituteId: c.institute.id, targetType: 'batch', targetId: id, before: { name: b.name, self_join: b.self_join }, after: f });
    return done();
  });
}

export async function copyBatch(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const b = await assertCanManageBatch(c, str(fd, 'id', 40));
    const { data, error } = await db().from('batches').insert({
      institute_id: c.institute.id, name: `${b.name} (copy)`.slice(0, 80), course: b.course, schedule_text: b.schedule_text,
      starts_on: b.starts_on, ends_on: b.ends_on, self_join: b.self_join, join_code: await uniqueJoinCode(), created_by: c.user.id,
    }).select('id').single();
    if (error) throw new UserError(error.message);
    const { data: ts } = await db().from('batch_teachers').select('teacher_id').eq('batch_id', b.id);
    if (ts?.length) await db().from('batch_teachers').insert(ts.map(t => ({ batch_id: data.id, teacher_id: t.teacher_id, institute_id: c.institute.id })));
    await logActivity({ actor: c.actor, action: 'batch.copied', instituteId: c.institute.id, targetType: 'batch', targetId: data.id, after: { from: b.id } });
    redirect(`/${slug}/admin/batches/${data.id}`);
  });
}

export async function setBatchStatus(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const b = await assertCanManageBatch(c, str(fd, 'id', 40));
    const status = b.status === 'active' ? 'archived' : 'active';
    await db().from('batches').update({ status }).eq('id', b.id);
    await logActivity({ actor: c.actor, action: `batch.${status === 'archived' ? 'archived' : 'restored'}`, instituteId: c.institute.id, targetType: 'batch', targetId: b.id });
    return done(status === 'archived' ? 'Batch archived.' : 'Batch restored.');
  });
}

export async function resetJoinCode(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const b = await assertCanManageBatch(c, str(fd, 'id', 40));
    const days = Number(fd.get('expires_days') || 0);
    const expires = days > 0 ? addDays(now(), Math.min(days, 365)).toISOString() : null;
    const code = await uniqueJoinCode();
    await db().from('batches').update({ join_code: code, join_code_expires_at: expires }).eq('id', b.id);
    await logActivity({ actor: c.actor, action: 'batch.join_code_reset', instituteId: c.institute.id, targetType: 'batch', targetId: b.id });
    return done(`New join code: ${code}`);
  });
}

async function addTeacherRow(c: Ctx, batchId: string, teacherId: string) {
  const { data: t } = await db().from('portal_users').select('id, role, status').eq('id', teacherId).eq('institute_id', c.institute.id).maybeSingle();
  if (!t || t.role !== 'teacher' || t.status !== 'active') throw new UserError('Choose an active teacher.');
  await db().from('batch_teachers').upsert({ batch_id: batchId, teacher_id: teacherId, institute_id: c.institute.id }, { onConflict: 'batch_id,teacher_id' });
}

export async function assignTeacher(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const b = await assertCanManageBatch(c, str(fd, 'batch_id', 40));
    const teacher = str(fd, 'teacher_id', 40);
    if (fd.get('remove') === '1') {
      await db().from('batch_teachers').delete().eq('batch_id', b.id).eq('teacher_id', teacher);
      await logActivity({ actor: c.actor, action: 'batch.teacher_removed', instituteId: c.institute.id, targetType: 'batch', targetId: b.id, after: { teacher } });
      return done('Teacher removed from the batch.');
    }
    await addTeacherRow(c, b.id, teacher);
    await logActivity({ actor: c.actor, action: 'batch.teacher_assigned', instituteId: c.institute.id, targetType: 'batch', targetId: b.id, after: { teacher } });
    return done('Teacher assigned.');
  });
}

/* ---------------------------------------------------------------- teachers and admins */
export async function inviteStaff(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const email = str(fd, 'email', 160).toLowerCase();
    const role = fd.get('role') === 'institute_admin' ? 'institute_admin' : 'teacher';
    const name = str(fd, 'name', 80);
    const batchId = str(fd, 'batch_id', 40) || null;
    if (!EMAIL_RE.test(email)) throw new UserError('Enter a valid email.');
    if (batchId) await assertCanManageBatch(c, batchId);
    const { data: existing } = await db().from('portal_users').select('id').eq('email', email).maybeSingle();
    if (existing) throw new UserError('That email already has a StemGrid portal account.');
    if (role === 'teacher') {
      const lim = await teacherLimit(c.institute.id);
      if (lim != null) {
        const [{ count: active }, { count: pending }] = await Promise.all([
          db().from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', c.institute.id).eq('role', 'teacher').eq('status', 'active'),
          db().from('invites').select('token_hash', { count: 'exact', head: true }).eq('institute_id', c.institute.id).eq('role', 'teacher').is('used_at', null).is('revoked_at', null).gt('expires_at', now().toISOString()),
        ]);
        if ((active ?? 0) + (pending ?? 0) >= lim) throw new UserError(`Your plan includes ${lim} teacher accounts and they're all used (including pending invites). Add a teacher account from Billing, or deactivate someone first.`);
      }
    }
    // a fresh invite replaces any pending one for the same email
    await db().from('invites').update({ revoked_at: now().toISOString() }).eq('institute_id', c.institute.id).eq('email', email).is('used_at', null).is('revoked_at', null);
    const token = newToken();
    await db().from('invites').insert({ token_hash: hashToken(token), institute_id: c.institute.id, role, email, display_name: name, batch_id: batchId, expires_at: addDays(now(), 7).toISOString(), invited_by: c.user.id });
    await sendMail({ to: email, ...emails.invite({ inviter: c.user.display_name, institute: c.institute.name, role: ROLE_LABEL[role].toLowerCase(), link: `${portalOrigin()}/${c.institute.slug}/invite/${token}` }) });
    await logActivity({ actor: c.actor, action: 'invite.sent', instituteId: c.institute.id, targetType: 'invite', after: { email, role, batch_id: batchId } });
    return done(`Invite sent to ${email}.`);
  });
}

export async function revokeInvite(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const hash = str(fd, 'token_hash', 80);
    await db().from('invites').update({ revoked_at: now().toISOString() }).eq('token_hash', hash).eq('institute_id', c.institute.id);
    await logActivity({ actor: c.actor, action: 'invite.revoked', instituteId: c.institute.id, targetType: 'invite' });
    return done('Invite cancelled.');
  });
}

export async function setStaffStatus(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const id = str(fd, 'id', 40);
    if (id === c.user.id) throw new UserError("You can't deactivate yourself.");
    const { data: u } = await db().from('portal_users').select('*').eq('id', id).eq('institute_id', c.institute.id).maybeSingle();
    if (!u || u.role === 'student') throw new UserError('Not a teacher or admin of your institute.');
    const status = u.status === 'active' ? 'archived' : 'active';
    if (status === 'active' && u.role === 'teacher') {
      const lim = await teacherLimit(c.institute.id);
      const { count } = await db().from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', c.institute.id).eq('role', 'teacher').eq('status', 'active');
      if (lim != null && (count ?? 0) >= lim) throw new UserError('All teacher accounts on your plan are in use.');
    }
    await db().from('portal_users').update({ status, current_session_id: null }).eq('id', id);
    await logActivity({ actor: c.actor, action: status === 'archived' ? 'user.deactivated' : 'user.reactivated', instituteId: c.institute.id, targetType: 'portal_user', targetId: id });
    return done(status === 'archived' ? `${u.display_name} can no longer sign in.` : `${u.display_name} can sign in again.`);
  });
}

/* ---------------------------------------------------------------- students (admins: all; teachers: their batches) */
export async function addStudent(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const name = str(fd, 'name', 80);
    if (name.length < 1) throw new UserError("Enter the student's name.");
    const batchId = str(fd, 'batch_id', 40) || null;
    if (!batchId && c.user.role === 'teacher') throw new UserError('Choose one of your batches.');
    const b = batchId ? await assertCanManageBatch(c, batchId) : null;
    const slips = await createStudents(c.institute, [{ name, username: str(fd, 'username', 30) || undefined, batchId, batchName: b?.name }], 'added', c.actor, c.user.id);
    revalidatePath('/', 'layout');
    return { ok: `${name} added.`, data: { slips } };
  });
}

export async function previewStudentsCsv(fixedBatchId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const file = fd.get('file');
    const text = file instanceof File && file.size ? await file.text() : String(fd.get('text') ?? '');
    if (text.length > 200_000) throw new UserError('That file is too big.');
    const fixed = fixedBatchId ? await assertCanManageBatch(c, fixedBatchId) : undefined;
    const rows = await previewCsv(c, text, fixed);
    return { data: { rows, text } };
  });
}

export async function importStudentsCsv(fixedBatchId: string | null, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const fixed = fixedBatchId ? await assertCanManageBatch(c, fixedBatchId) : undefined;
    const rows = await previewCsv(c, String(fd.get('text') ?? ''), fixed);
    const good = rows.filter(r => !r.error);
    if (!good.length) throw new UserError('No valid rows to import.');
    const slips = await createStudents(c.institute, good.map(r => ({ name: r.name, username: r.username || r.suggested, batchId: r.batchId, batchName: r.batch || null })), 'csv', c.actor, c.user.id);
    revalidatePath('/', 'layout');
    return { ok: `${slips.length} students created${rows.length > good.length ? `, ${rows.length - good.length} rows skipped` : ''}.`, data: { slips } };
  });
}

export async function resetPins(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const ids = fd.getAll('id').map(String).slice(0, 300);
    if (!ids.length) throw new UserError('Select at least one student.');
    const slips: Slip[] = [];
    for (const id of ids) {
      const st = await assertCanManageStudent(c, id);
      slips.push(await resetPin(c.institute, st, c.actor));
    }
    return { ok: `New PIN${slips.length > 1 ? 's' : ''} ready. They are shown only now: print or write them down.`, data: { slips } };
  });
}

export async function setStudentStatus(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const ids = fd.getAll('id').map(String).slice(0, 300);
    const to = fd.get('to') === 'active' ? 'active' : 'archived';
    for (const id of ids) {
      await assertCanManageStudent(c, id);
      await db().from('portal_users').update({ status: to, current_session_id: null }).eq('id', id);
    }
    await logActivity({ actor: c.actor, action: to === 'archived' ? 'students.archived' : 'students.restored', instituteId: c.institute.id, targetType: 'portal_user', after: { ids } });
    return done(`${ids.length} student${ids.length === 1 ? '' : 's'} ${to === 'archived' ? 'archived (they can no longer sign in; this month\'s count is unchanged)' : 'restored'}.`);
  });
}

export async function renameStudent(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const st = await assertCanManageStudent(c, str(fd, 'id', 40));
    const name = str(fd, 'name', 80);
    if (!name) throw new UserError('Enter a name.');
    await db().from('portal_users').update({ display_name: name }).eq('id', st.id);
    await logActivity({ actor: c.actor, action: 'student.renamed', instituteId: c.institute.id, targetType: 'portal_user', targetId: st.id, before: { name: st.display_name }, after: { name } });
    return done();
  });
}

/* Add to, remove from, or move between batches. */
export async function studentBatch(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await staff();
    const ids = fd.getAll('id').map(String).slice(0, 300);
    const op = String(fd.get('op'));
    const from = str(fd, 'from', 40), to = str(fd, 'to', 40);
    if (!ids.length) throw new UserError('Select at least one student.');
    if ((op === 'add' || op === 'move') && !to) throw new UserError('Choose a batch.');
    if (to) await assertCanManageBatch(c, to);
    if (from) await assertCanManageBatch(c, from);
    for (const id of ids) {
      await assertCanManageStudent(c, id);
      if ((op === 'remove' || op === 'move') && from) await db().from('batch_students').update({ removed_at: now().toISOString() }).eq('batch_id', from).eq('student_id', id);
      if (op === 'add' || op === 'move') await db().from('batch_students').upsert({ batch_id: to, student_id: id, institute_id: c.institute.id, removed_at: null, joined_via: 'added', joined_at: now().toISOString() }, { onConflict: 'batch_id,student_id' });
    }
    await logActivity({ actor: c.actor, action: `students.batch_${op}`, instituteId: c.institute.id, targetType: 'batch', targetId: to || from, after: { ids, from, to } });
    return done(op === 'remove' ? 'Removed from the batch.' : op === 'move' ? 'Moved.' : 'Added to the batch.');
  });
}

/* ---------------------------------------------------------------- institute profile, logo, plan */
export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const patch = {
      name: str(fd, 'name', 120) || c.institute.name, type: str(fd, 'type', 60), city: str(fd, 'city', 80), state: str(fd, 'state', 80),
      address: str(fd, 'address', 400), gst_number: str(fd, 'gst_number', 20).toUpperCase(), contact_name: str(fd, 'contact_name', 80), contact_phone: str(fd, 'contact_phone', 20),
    };
    if (patch.name.length < 2) throw new UserError('Enter the institute name.');
    await db().from('institutes').update(patch).eq('id', c.institute.id);
    const before = Object.fromEntries(Object.keys(patch).map(k => [k, c.institute[k as keyof typeof c.institute]]));
    await logActivity({ actor: c.actor, action: 'institute.profile_updated', instituteId: c.institute.id, targetType: 'institute', targetId: c.institute.id, before, after: patch });
    return done('Profile saved.');
  });
}

export async function uploadLogo(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    const file = fd.get('logo');
    if (fd.get('remove') === '1') {
      await db().storage.from('institute-logos').remove([`${c.institute.id}/logo.webp`]);
      await db().from('institutes').update({ logo_path: null }).eq('id', c.institute.id);
      await logActivity({ actor: c.actor, action: 'institute.logo_removed', instituteId: c.institute.id });
      return done('Logo removed.');
    }
    if (!(file instanceof File) || !file.size) throw new UserError('Choose an image.');
    if (file.size > 1024 * 1024) throw new UserError('The logo must be under 1 MB.');
    const buf = Buffer.from(await file.arrayBuffer());
    // check the real file type from its first bytes, not the name the browser sent
    const type = buf.subarray(0, 4).toString('hex') === '89504e47' ? 'image/png'
      : buf.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'image/jpeg'
      : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
    if (!type) throw new UserError('Use a PNG, JPG or WebP image.');
    const path = `${c.institute.id}/logo.webp`;
    const { error } = await db().storage.from('institute-logos').upload(path, buf, { contentType: type, upsert: true, cacheControl: '300' });
    if (error) throw new UserError(error.message);
    await db().from('institutes').update({ logo_path: path }).eq('id', c.institute.id);
    await logActivity({ actor: c.actor, action: 'institute.logo_updated', instituteId: c.institute.id });
    return done('Logo saved.');
  });
}

export async function confirmPlanAction(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const c = await admin();
    await confirmPlan(c.institute, str(fd, 'plan', 20), c.actor);
    return done('Plan confirmed. It starts when your free period ends.');
  });
}
