import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* A fresh client per request, acting as the signed-in user (RLS applies).
   Cookies are host-only: never pass a `domain` option (brief §7.5). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) {
          // Server Components can't set cookies; the proxy refreshes the session instead.
          try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
        },
      },
    },
  );
}
