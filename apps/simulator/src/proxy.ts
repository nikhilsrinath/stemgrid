import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/* Runs before every page request:
   - refreshes the Supabase session cookie (Server Components can't write cookies)
   - signed-out visitors to account pages go to /login?next=...
   - signed-in visitors to /login or /signup go to their projects
   - signed-in users who haven't finished onboarding go to /onboarding */
const PRIVATE = ['/projects', '/profile', '/onboarding'];
const AUTH_ONLY_GUESTS = ['/login', '/signup', '/forgot-password'];
const NEEDS_PROFILE = ['/projects', '/profile', '/simulator/'];

const under = (path: string, list: string[]) => list.some(p => p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(p + '/'));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list, headers) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Don't put code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub as string | undefined;
  const path = request.nextUrl.pathname;

  const redirect = (to: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = to; url.search = '';
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach(c => res.cookies.set(c));
    return res;
  };

  if (!uid && under(path, PRIVATE)) {
    return redirect('/login', { next: path + request.nextUrl.search });
  }
  // (the institution enquiry form on /signup?as=institution stays open to signed-in users)
  if (uid && under(path, AUTH_ONLY_GUESTS) && !(path === '/signup' && request.nextUrl.searchParams.get('as') === 'institution')) {
    return redirect('/projects');
  }
  if (uid && under(path, NEEDS_PROFILE)) {
    const { data: p } = await supabase.from('profiles').select('onboarded').eq('id', uid).single();
    if (p && !p.onboarded) return redirect('/onboarding', { next: path + request.nextUrl.search });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
