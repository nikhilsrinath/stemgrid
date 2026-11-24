'use server';

import { revalidatePath } from 'next/cache';
import { act, getInstituteBySlug, getMember, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { cleanText } from '@/lib/rules';
import { logActivity } from '@/lib/activity';
import { createStudents } from '@/lib/students';
import { findBatch } from '@/lib/batches';
import type { FormState } from '@/lib/types';

const SELF_JOINS_PER_HOUR = 60;

async function openInst(slug: string) {
  const inst = await getInstituteBySlug(slug);
  if (!inst || !['paid', 'onboarding', 'free_period', 'active', 'grace'].includes(inst.status)) throw new UserError("This institute isn't taking new students right now.");
  return inst;
}

/* A signed-in student adds another batch of the same institute with its code. */
export async function joinWithCode(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInst(slug);
    const me = await getMember();
    if (!me || me.role !== 'student' || me.institute_id !== inst.id || me.status !== 'active') throw new UserError('Sign in as a student of this institute first.');
    const batch = await findBatch(inst.id, String(fd.get('code') ?? ''));
    if (!batch) throw new UserError("That code didn't work. Check it with your teacher.");
    await supabaseAdmin().from('batch_students').upsert({ batch_id: batch.id, student_id: me.id, institute_id: inst.id, removed_at: null, joined_via: 'code', joined_at: now().toISOString() }, { onConflict: 'batch_id,student_id' });
    await logActivity({ actor: { kind: 'portal', id: me.id, name: `${me.display_name} (student)` }, action: 'student.joined_batch', instituteId: inst.id, targetType: 'batch', targetId: batch.id });
    revalidatePath('/', 'layout');
    return { ok: `You've joined ${batch.name}.` };
  });
}

/* Self-join (if the batch allows it): a new student types their name and gets a username + PIN. */
export async function selfJoin(slug: string, code: string, _: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const inst = await openInst(slug);
    const batch = await findBatch(inst.id, code);
    if (!batch) throw new UserError("That code didn't work. Check it with your teacher.");
    if (!batch.self_join) throw new UserError('Ask your teacher to add you to this batch.');
    const name = cleanText(fd.get('name'), 80);
    if (name.length < 2 || !/[a-z]/i.test(name)) throw new UserError('Type your first and last name.');
    const { count } = await supabaseAdmin().from('batch_students').select('student_id', { count: 'exact', head: true })
      .eq('batch_id', batch.id).eq('joined_via', 'self').gte('joined_at', addDays(now(), -1 / 24).toISOString());
    if ((count ?? 0) >= SELF_JOINS_PER_HOUR) throw new UserError('Lots of people are joining right now. Please try again in a few minutes.');
    const [slip] = await createStudents(inst, [{ name, batchId: batch.id, batchName: batch.name }], 'self', { kind: 'portal', id: null, name: `${name} (self-join ${batch.join_code})` }, null);
    return { data: { slip } };
  });
}
