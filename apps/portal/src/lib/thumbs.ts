import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/* Thumbnails are private: sign short-lived URLs for the projects the caller may already see. */
export async function signThumbs(paths: (string | null)[]) {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return new Map<string, string>();
  const { data } = await supabaseAdmin().storage.from('student-thumbnails').createSignedUrls(list, 3600);
  return new Map((data ?? []).filter(d => d.signedUrl && d.path).map(d => [d.path!, d.signedUrl]));
}
