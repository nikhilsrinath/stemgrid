import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';

export type Actor = { kind: 'staff' | 'portal' | 'system'; id?: string | null; name: string };
export const SYSTEM: Actor = { kind: 'system', name: 'Daily job' };

/* Append one line to the activity log (kept at least 12 months; never updated or deleted). */
export async function logActivity(a: {
  actor: Actor; action: string; instituteId?: string | null;
  targetType?: string; targetId?: string; before?: unknown; after?: unknown;
}) {
  const { error } = await supabaseAdmin().from('activity_log').insert({
    institute_id: a.instituteId ?? null,
    actor_id: a.actor.id ?? null,
    actor_kind: a.actor.kind,
    actor_name: a.actor.name,
    action: a.action,
    target_type: a.targetType ?? null,
    target_id: a.targetId ?? null,
    before: a.before ?? null,
    after: a.after ?? null,
    at: now().toISOString(),
  });
  if (error) console.error('[activity] could not log', a.action, error.message);
}
