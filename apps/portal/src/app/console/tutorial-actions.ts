'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { act, consoleBase, requireStaff, UserError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';
import { cleanText } from '@/lib/rules';
import { LEVELS, PART_IDS, stepsProblem, TUTORIAL_SLUG_RE } from '@/lib/tutorials';
import type { FormState } from '@/lib/types';

/* TinkerAI tutorials: create or update one (id empty = new). Staff only, service role. */
export async function saveTutorial(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const db = supabaseAdmin();
    const id = String(fd.get('id') ?? '');

    const title = cleanText(fd.get('title'), 120);
    if (title.length < 3) throw new UserError('Give the tutorial a title.');
    const slug = cleanText(fd.get('slug'), 60).toLowerCase();
    if (!TUTORIAL_SLUG_RE.test(slug)) throw new UserError('The web address must be 3–60 lowercase letters, numbers or dashes, like led-ultrasonic.');
    const level = String(fd.get('level') ?? '');
    if (!(LEVELS as readonly string[]).includes(level)) throw new UserError('Choose a level.');
    const parts = fd.getAll('parts').map(String).filter(p => (PART_IDS as readonly string[]).includes(p));
    if (!parts.length) throw new UserError('Tick the parts the tutorial uses.');
    const minutes = Number(fd.get('minutes'));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new UserError('Minutes must be a whole number from 1 to 240.');
    const sort = Number(fd.get('sort'));
    if (!Number.isInteger(sort) || sort < 0 || sort > 10000) throw new UserError('Order must be a whole number from 0 to 10000.');
    const summary = cleanText(fd.get('summary'), 400);
    const outro = cleanText(fd.get('outro'), 400);
    const code = String(fd.get('code') ?? '').replace(/\r\n/g, '\n').replace(/\t/g, '    ');
    if (!code.trim()) throw new UserError('Add the code the tutorial fills in.');
    if (code.length > 8000) throw new UserError('The code is too long (8000 characters at most).');
    let steps: unknown;
    try { steps = JSON.parse(String(fd.get('steps') ?? '')); }
    catch (e) { throw new UserError(`The steps aren't valid JSON: ${(e as Error).message}`); }
    const problem = stepsProblem(steps);
    if (problem) throw new UserError(problem);
    const lines = code.split('\n').length;
    for (const s of steps as { do: string; notes?: { lines: number[] }[] }[])
      if (s.do === 'code' && s.notes?.some(n => n.lines.some(l => l > lines))) throw new UserError(`A code note points past the last line of the code (line ${lines}).`);

    const row = { title, slug, level, parts, minutes, sort, summary, outro, code, steps, published: fd.get('published') === 'on' };
    const { data: clash } = await db.from('tutorials').select('id').eq('slug', slug).maybeSingle();
    if (clash && clash.id !== id) throw new UserError('Another tutorial already uses that web address.');

    let savedId = id;
    if (id) {
      const { error } = await db.from('tutorials').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { data, error } = await db.from('tutorials').insert(row).select('id').single();
      if (error) throw error;
      savedId = data.id;
    }
    await logActivity({ actor, action: id ? 'tutorial.update' : 'tutorial.create', targetType: 'tutorial', targetId: savedId, after: { slug, title, published: row.published } });
    revalidatePath('/console/tutorials');
    if (!id) redirect(`${await consoleBase()}/tutorials/${savedId}?created=1`);
    return { ok: row.published ? 'Saved. It is live on TinkerAI.' : 'Saved as a draft. Tick Published to show it on TinkerAI.' };
  });
}

export async function deleteTutorial(_: FormState, fd: FormData): Promise<FormState> {
  return act(async () => {
    const { actor } = await requireStaff();
    const id = String(fd.get('id') ?? '');
    const db = supabaseAdmin();
    const { data: t } = await db.from('tutorials').select('slug, title').eq('id', id).maybeSingle();
    if (!t) throw new UserError('That tutorial is already gone.');
    const { error } = await db.from('tutorials').delete().eq('id', id);
    if (error) throw error;
    await logActivity({ actor, action: 'tutorial.delete', targetType: 'tutorial', targetId: id, before: t });
    redirect(`${await consoleBase()}/tutorials`);
  });
}
