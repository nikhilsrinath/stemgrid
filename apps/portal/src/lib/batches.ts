import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { cleanJoinCode, JOIN_CODE_RE } from '@/lib/rules';
import type { Batch } from '@/lib/types';

/* An active batch of this institute with this join code (and the code not expired), or null. */
export async function findBatch(instituteId: string, raw: string) {
  const code = cleanJoinCode(raw);
  if (!JOIN_CODE_RE.test(code)) return null;
  const { data } = await supabaseAdmin().from('batches').select('*').eq('join_code', code).eq('institute_id', instituteId).maybeSingle<Batch>();
  if (!data || data.status !== 'active') return null;
  if (data.join_code_expires_at && new Date(data.join_code_expires_at) < now()) return null;
  return data;
}
