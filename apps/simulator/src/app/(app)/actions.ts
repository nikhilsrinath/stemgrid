'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';
import type { Role } from '@/lib/types';

export type ProfileState = { error?: string; field?: string; saved?: boolean } | undefined;

const ROLES: Role[] = ['student', 'teacher', 'maker'];
const USERNAME = /^[a-z0-9_]{3,20}$/;
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

function read(form: FormData): { error: string; field: string } | { values: Record<string, unknown> } {
  const display_name = str(form, 'display_name').slice(0, 50);
  const username = str(form, 'username').toLowerCase();
  const role = str(form, 'role') as Role;
  const bio = str(form, 'bio').slice(0, 280);
  const avatar = str(form, 'avatar_url');
  if (!display_name) return { error: 'Tell us what to call you.', field: 'display_name' };
  if (!USERNAME.test(username)) return { error: 'Usernames are 3 to 20 characters: lowercase letters, numbers and _.', field: 'username' };
  if (!ROLES.includes(role)) return { error: 'Pick the one that fits you best.', field: 'role' };
  const okAvatar = !avatar || avatar.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`) || avatar.startsWith('https://lh3.googleusercontent.com/');
  return { values: { display_name, username, role, bio, avatar_url: okAvatar && avatar ? avatar : null } };
}

async function write(values: Record<string, unknown>): Promise<ProfileState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('profiles').update(values).eq('id', user.id);
  if (error) {
    if (error.code === '23505') return { error: 'Someone already has that username. Try another.', field: 'username' };
    return { error: "Couldn't save your profile. Try again in a moment." };
  }
  return undefined;
}

export async function completeOnboarding(_: ProfileState, form: FormData): Promise<ProfileState> {
  const r = read(form);
  if ('error' in r) return r;
  const res = await write({ ...r.values, onboarded: true });
  if (res?.error) return res;
  revalidatePath('/', 'layout');
  redirect(safeNext(str(form, 'next')));
}

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const r = read(form);
  if ('error' in r) return r;
  const res = await write(r.values);
  if (res?.error) return res;
  revalidatePath('/', 'layout');
  return { saved: true };
}

export async function changePassword(_: ProfileState, form: FormData): Promise<ProfileState> {
  const password = String(form.get('password') ?? ''), again = String(form.get('again') ?? '');
  if (password.length < 8) return { error: 'Pick a longer password: at least 8 characters.', field: 'password' };
  if (password !== again) return { error: "The two passwords don't match.", field: 'again' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different|same/i.test(error.message)) return { error: 'Your new password has to be different from your old one.' };
    if (/reauth|recent/i.test(error.message)) return { error: 'For safety, sign out and back in, then change your password.' };
    return { error: "Couldn't change your password. Try again in a moment." };
  }
  return { saved: true };
}

export async function deleteAccount(_: ProfileState, form: FormData): Promise<ProfileState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
  if (str(form, 'confirm').toLowerCase() !== String(profile?.username ?? '').toLowerCase()) {
    return { error: 'Type your username exactly to confirm.', field: 'confirm' };
  }
  // files first (Storage API; SQL can't delete them), then the account itself
  for (const bucket of ['avatars', 'thumbnails']) {
    const { data: files } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files?.length) await supabase.storage.from(bucket).remove(files.map(f => `${user.id}/${f.name}`));
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: "Couldn't delete your account. Try again in a moment." };
  await supabase.auth.signOut();
  redirect('/?deleted=1');
}
