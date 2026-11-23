'use client';

/* Project helpers for client components. Row-level security makes every query
   "my projects only", so no owner filter is needed. */
import { supabaseBrowser } from '@/lib/supabase/client';
import type { BuildData, ProjectSummary } from '@/lib/types';

export const SUMMARY = 'id, name, thumbnail_path, module_count, created_at, updated_at';
export const NAME_MAX = 80;

export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Untitled build';
export const moduleCount = (d: BuildData) => (Array.isArray(d.modules) ? d.modules.length : 0);

const fail = (msg: string, error: { message: string } | null) => {
  if (error) throw new Error(`${msg} (${error.message})`);
};

export async function createProject(name = 'Untitled build', data: BuildData = {}) {
  const { data: row, error } = await supabaseBrowser()
    .from('projects')
    .insert({ name: cleanName(name), data, module_count: moduleCount(data) })
    .select(SUMMARY)
    .single<ProjectSummary>();
  fail("Couldn't create the project", error);
  return row!;
}

export async function saveProject(id: string, patch: { name?: string; data?: BuildData; thumbnail_path?: string }) {
  const body: Record<string, unknown> = { ...patch };
  if (patch.name != null) body.name = cleanName(patch.name);
  if (patch.data) body.module_count = moduleCount(patch.data);
  const { error } = await supabaseBrowser().from('projects').update(body).eq('id', id);
  fail("Couldn't save", error);
}

export async function renameProject(id: string, name: string) {
  await saveProject(id, { name });
}

export async function duplicateProject(id: string, uid: string) {
  const sb = supabaseBrowser();
  const { data: src, error } = await sb.from('projects').select('name, data, thumbnail_path').eq('id', id)
    .single<{ name: string; data: BuildData; thumbnail_path: string | null }>();
  fail("Couldn't copy the project", error);
  const copy = await createProject(`${src!.name} (copy)`.slice(0, NAME_MAX), src!.data);
  if (src!.thumbnail_path) {                     // reuse the picture (best effort)
    const path = `${uid}/${copy.id}.webp`;
    const { error: e } = await sb.storage.from('thumbnails').copy(src!.thumbnail_path, path);
    if (!e) { await saveProject(copy.id, { thumbnail_path: path }); copy.thumbnail_path = path; }
  }
  return copy;
}

export async function deleteProject(id: string, uid: string) {
  const sb = supabaseBrowser();
  const { error } = await sb.from('projects').delete().eq('id', id);
  fail("Couldn't delete the project", error);
  await sb.storage.from('thumbnails').remove([`${uid}/${id}.webp`]);
}

export async function uploadThumbnail(uid: string, projectId: string, blob: Blob) {
  const path = `${uid}/${projectId}.webp`;
  const { error } = await supabaseBrowser().storage.from('thumbnails')
    .upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '60' });
  fail("Couldn't upload the picture", error);
  return path;
}

/* Guest builds live in this browser until the guest signs in and claims them. */
const DRAFT_KEY = 'sg:draft';
export type Draft = { name: string; data: BuildData; at: number };
export const draft = {
  get(): Draft | null {
    try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); return d && d.data ? d : null; } catch { return null; }
  },
  set(d: Draft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} },
  clear() { try { localStorage.removeItem(DRAFT_KEY); } catch {} },
};
