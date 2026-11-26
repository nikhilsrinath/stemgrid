import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Profile } from '@/lib/types';

/* A fresh server client per request (Server Components, Server Actions, Route Handlers). */
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

export type SessionUser = { id: string; email: string | null };

/* The signed-in user and their profile, or nulls. Deduplicated within one request.
   getClaims() checks the session token's signature locally (the project signs with ES256 and the
   public key is cached), so this costs one round trip to Supabase (the profile), not two.
   Pages that need the full auth record (identities, say) call supabase.auth.getUser() themselves. */
export const getSession = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return { supabase, user: null, profile: null };
  const user: SessionUser = { id: sub, email: (data.claims.email as string | undefined) || null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>();
  return { supabase, user, profile: profile ?? null };
});
