'use client';

/* Simulator saves inside the portal (student_projects). RLS makes writes "my own projects only"
   and checks the institute, so the browser can save directly, as the simulator app does. */
import { supabaseBrowser } from '@/lib/supabase/client';
import type { BuildData } from '@/lib/types';

export const SUMMARY = 'id, name, thumbnail_path, module_count, created_at, updated_at, owner_id';
export const NAME_MAX = 80;
export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Untitled build';
export const moduleCount = (d: BuildData) => (Array.isArray(d.modules) ? d.modules.length : 0);

const fail = (msg: string, error: { message: string } | null) => { if (error) throw new Error(`${msg} (${error.message})`); };
export type Owner = { uid: string; instituteId: string };
export const thumbPath = (o: Owner, projectId: string) => `${o.instituteId}/${o.uid}/${projectId}.webp`;

export async function createProject(o: Owner, name = 'Untitled build', data: BuildData = {}) {
  const { data: row, error } = await supabaseBrowser().from('student_projects')
    .insert({ institute_id: o.instituteId, owner_id: o.uid, name: cleanName(name), data, module_count: moduleCount(data) })
    .select(SUMMARY).single<{ id: string }>();
  fail("Couldn't create the project", error);
  return row!;
}

export async function saveProject(id: string, patch: { name?: string; data?: BuildData; thumbnail_path?: string }) {
  const body: Record<string, unknown> = { ...patch };
  if (patch.name != null) body.name = cleanName(patch.name);
  if (patch.data) body.module_count = moduleCount(patch.data);
  const { error } = await supabaseBrowser().from('student_projects').update(body).eq('id', id);
  fail("Couldn't save", error);
}

export async function uploadThumbnail(o: Owner, projectId: string, blob: Blob) {
  const path = thumbPath(o, projectId);
  const { error } = await supabaseBrowser().storage.from('student-thumbnails').upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '60' });
  fail("Couldn't upload the picture", error);
  return path;
}

export async function duplicateProject(o: Owner, id: string) {
  const sb = supabaseBrowser();
  const { data: src, error } = await sb.from('student_projects').select('name, data, thumbnail_path').eq('id', id)
    .single<{ name: string; data: BuildData; thumbnail_path: string | null }>();
  fail("Couldn't copy the project", error);
  const copy = await createProject(o, `${src!.name} (copy)`.slice(0, NAME_MAX), src!.data);
  if (src!.thumbnail_path) {
    const path = thumbPath(o, copy.id);
    const { error: e } = await sb.storage.from('student-thumbnails').copy(src!.thumbnail_path, path);
    if (!e) await saveProject(copy.id, { thumbnail_path: path });
  }
  return copy;
}

export async function deleteProject(o: Owner, id: string) {
  const sb = supabaseBrowser();
  const { error } = await sb.from('student_projects').delete().eq('id', id);
  fail("Couldn't delete the project", error);
  await sb.storage.from('student-thumbnails').remove([thumbPath(o, id)]);
}
