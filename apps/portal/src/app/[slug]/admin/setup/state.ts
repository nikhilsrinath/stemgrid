import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import type { Institute } from '@/lib/types';

/* The first-run checklist: logo, profile, first teacher, first batch. */
export async function setupState(inst: Institute) {
  const db = supabaseAdmin();
  const [teachers, invites, batches] = await Promise.all([
    db.from('portal_users').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('role', 'teacher'),
    db.from('invites').select('token_hash', { count: 'exact', head: true }).eq('institute_id', inst.id).eq('role', 'teacher').is('revoked_at', null).gt('expires_at', now().toISOString()),
    db.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', inst.id),
  ]);
  const b = `/${inst.slug}/admin`;
  const items = [
    { key: 'logo', label: 'Add your logo', done: !!inst.logo_path, href: `${b}/settings`, hint: 'Students see it on your sign-in page.' },
    { key: 'profile', label: 'Complete your profile', done: !!(inst.address && inst.state && inst.city), href: `${b}/settings`, hint: 'Address and state appear on your GST invoices.' },
    { key: 'teacher', label: 'Invite your first teacher', done: (teachers.count ?? 0) + (invites.count ?? 0) > 0, href: `${b}/teachers`, hint: 'Teachers manage their own batches and students.' },
    { key: 'batch', label: 'Create your first batch', done: (batches.count ?? 0) > 0, href: `${b}/batches?new=1`, hint: 'Batches are unlimited. Each gets a join code.' },
  ];
  return { items, done: items.every(i => i.done) };
}
