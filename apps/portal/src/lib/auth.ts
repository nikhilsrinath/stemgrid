import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isLocal } from '@/lib/mode';
import type { Actor } from '@/lib/activity';
import { ROLE_HOME, type FormState, type Institute, type PortalUser, type Role } from '@/lib/types';

/* A message that is safe and useful to show the person who caused it. */
export class UserError extends Error {}

/* Wraps a server action body: UserErrors become a friendly message on the form, redirects pass
   through, anything unexpected is logged and shown as a plain "try again". */
export async function act(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) ?? { ok: 'Saved.' };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof UserError) return { error: e.message };
    console.error('[action]', e);
    return { error: 'Something went wrong. Please try again.' };
  }
}

/* ---------------------------------------------------------------- the signed-in session */
export const getAuth = cache(async () => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const c = data?.claims as Record<string, unknown> | undefined;
  return {
    sb,
    uid: (c?.sub as string | undefined) ?? null,
    sessionId: (c?.session_id as string | undefined) ?? null,
    aal: (c?.aal as string | undefined) ?? null,
    email: (c?.email as string | undefined) ?? null,
  };
});

export const getMember = cache(async (): Promise<PortalUser | null> => {
  const { uid } = await getAuth();
  if (!uid) return null;
  const { data } = await supabaseAdmin().from('portal_users').select('*').eq('id', uid).maybeSingle<PortalUser>();
  return data ?? null;
});

export const getInstitute = cache(async (id: string): Promise<Institute | null> => {
  const { data } = await supabaseAdmin().from('institutes').select('*').eq('id', id).maybeSingle<Institute>();
  return data ?? null;
});

export const getInstituteBySlug = cache(async (slug: string): Promise<Institute | null> => {
  const { data } = await supabaseAdmin().from('institutes').select('*').eq('slug', slug.toLowerCase()).maybeSingle<Institute>();
  return data ?? null;
});

export type Ctx = { sb: Awaited<ReturnType<typeof supabaseServer>>; user: PortalUser; institute: Institute; actor: Actor };

/* For server actions: the caller's portal account and institute, derived only from the session
   (never from anything the browser sends). */
export async function requireMember(roles?: Role[]): Promise<Ctx> {
  const { sb, uid } = await getAuth();
  if (!uid) throw new UserError('Please sign in again.');
  const user = await getMember();
  if (!user || user.status !== 'active') throw new UserError('Please sign in again.');
  if (roles && !roles.includes(user.role)) throw new UserError("You don't have access to that.");
  const institute = await getInstitute(user.institute_id);
  if (!institute) throw new UserError('Please sign in again.');
  return { sb, user, institute, actor: { kind: 'portal', id: user.id, name: `${user.display_name} (${user.role})` } };
}

/* For pages under /<slug>/...: the proxy has already checked the session, institute and role;
   this repeats the check (pages must not rely on the proxy alone) and loads what the page needs. */
export async function pageMember(slug: string, roles?: Role[]): Promise<Ctx> {
  const { sb, uid } = await getAuth();
  if (!uid) redirect(`/${slug}/login`);
  const user = await getMember();
  if (!user || user.status !== 'active') redirect(`/${slug}/login`);
  const institute = await getInstitute(user.institute_id);
  if (!institute || institute.slug !== slug.toLowerCase()) redirect(`/${slug}/login?reason=other_institute`);
  if (roles && !roles.includes(user.role)) redirect(`/${slug}/${ROLE_HOME[user.role]}`);
  return { sb, user, institute, actor: { kind: 'portal', id: user.id, name: `${user.display_name} (${user.role})` } };
}

/* Suspended institutes: students are blocked (by the proxy), admins and teachers can look but not change. */
export function isReadOnly(inst: Institute) {
  return inst.status === 'suspended' || inst.status === 'lapsed' || inst.status === 'cancelled';
}
export function assertWritable(inst: Institute) {
  if (isReadOnly(inst)) throw new UserError('Your institute is read-only until the overdue payment is sorted out. Please contact StemGrid.');
}

/* ---------------------------------------------------------------- staff (console) */
export type Staff = { id: string; name: string; email: string; active: boolean };

export const getStaff = cache(async (): Promise<Staff | null> => {
  const { uid } = await getAuth();
  if (!uid) return null;
  const { data } = await supabaseAdmin().from('staff_users').select('id, name, email, active').eq('id', uid).maybeSingle<Staff>();
  return data && data.active ? data : null;
});

/* Staff must have passed TOTP (aal2). Local mode skips TOTP to keep testing quick. */
export async function staffOk() {
  const staff = await getStaff();
  if (!staff) return null;
  const { aal } = await getAuth();
  if (!isLocal() && aal !== 'aal2') return null;
  return staff;
}

export async function requireStaff(): Promise<{ staff: Staff; actor: Actor }> {
  const staff = await staffOk();
  if (!staff) throw new UserError('Please sign in to the console again.');
  return { staff, actor: { kind: 'staff', id: staff.id, name: staff.name } };
}

/* Console links: on admin.stemgrid.in the console lives at "/"; on plain localhost at "/console". */
export async function consoleBase() {
  return (await headers()).get('x-sg-console-base') ?? '';
}
export async function pageStaff() {
  const staff = await staffOk();
  if (!staff) redirect(`${await consoleBase()}/login`);
  return staff;
}
