import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { isLocal } from '@/lib/mode';
import { now } from '@/lib/clock';
import { monthKey, monthStart } from '@/lib/dates';

/* Runs before every page request (brief §8.1):
   1. refreshes the Supabase session (host-only cookies)
   2. host gate: admin.* is the StemGrid console, learn.* the institute portal
   3. console: staff only, with TOTP (aal2)
   4. portal /<slug>/...: institute, session, role and status checks
   5. counts students once per IST month, blocking new ones past the institute's limit */

const ROOT_PAGES = new Set(['', 'activate', 'privacy', 'terms', 'auth', 'find']);
const PUBLIC_SUB = new Set(['login', 'join', 'invite', 'reset', 'help', 'closed']);
const AREA_ROLE: Record<string, string> = { admin: 'institute_admin', teacher: 'teacher', student: 'student' };
const HOME: Record<string, string> = { institute_admin: 'admin/dashboard', teacher: 'teacher/batches', student: 'student/home' };
const OPEN = new Set(['paid', 'onboarding', 'free_period', 'active', 'grace', 'suspended']);

let adminClient: ReturnType<typeof createClient> | undefined;
const admin = () => (adminClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
}));

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
  const claims = data?.claims as Record<string, unknown> | undefined;
  const uid = (claims?.sub as string | undefined) ?? null;

  const url = request.nextUrl;
  const path = url.pathname;
  const hostname = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const isConsoleHost = hostname.startsWith('admin.');
  const isPlainLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // carry refreshed cookies onto whatever response we return
  const keep = (res: NextResponse) => {
    response.cookies.getAll().forEach(c => res.cookies.set(c));
    return res;
  };
  const redirectTo = (to: string, params?: Record<string, string>, status = 307) => {
    const u = url.clone();
    u.pathname = to; u.search = '';
    for (const [k, v] of Object.entries(params ?? {})) u.searchParams.set(k, v);
    return keep(NextResponse.redirect(u, status));
  };
  const rewriteTo = (to: string, headers?: Record<string, string>) => {
    const u = url.clone(); u.pathname = to;
    const h = new Headers(request.headers);
    for (const [k, v] of Object.entries(headers ?? {})) h.set(k, v);
    return keep(NextResponse.rewrite(u, { request: { headers: h } }));
  };
  const notFound = () => rewriteTo('/__not-found');
  const signOut = async () => { await supabase.auth.signOut({ scope: 'local' }); };

  // API routes authenticate themselves (webhook signature, cron secret, invoice owner).
  if (path.startsWith('/api/')) return response;
  // Local testing pages exist only in local mode.
  if (path === '/dev' || path.startsWith('/dev/')) return isLocal() ? response : notFound();

  /* ---------------------------------------------------------------- console */
  const consoleRequest = isConsoleHost || (isPlainLocalhost && (path === '/console' || path.startsWith('/console/')));
  if (!isConsoleHost && !consoleRequest && (path === '/console' || path.startsWith('/console/'))) return notFound();

  if (consoleRequest) {
    const base = isConsoleHost && !path.startsWith('/console') ? '' : '/console';
    const inner = base ? path : '/console' + (path === '/' ? '' : path);
    const sub = inner.replace(/^\/console/, '') || '/';
    const forward = (to = inner) => rewriteTo(to, { 'x-sg-console-base': base });
    if (sub === '/login') return forward();

    let ok = false;
    if (uid) {
      const { data: staff } = await admin().from('staff_users').select('active').eq('id', uid).maybeSingle<{ active: boolean }>();
      ok = !!staff?.active && (isLocal() || claims?.aal === 'aal2');
    }
    if (!ok) return redirectTo(`${base}/login`, sub === '/' ? undefined : { next: base + sub });
    return forward(sub === '/' ? '/console/enquiries' : inner);
  }

  /* ---------------------------------------------------------------- portal */
  const parts = path.split('/');               // ['', slug, area, ...]
  const seg = parts[1] ?? '';
  if (ROOT_PAGES.has(seg)) return response;

  const slug = seg.toLowerCase();
  type Inst = { id: string; slug: string; status: string };
  const { data: inst } = await admin().from('institutes').select('id, slug, status').eq('slug', slug).maybeSingle<Inst>();
  if (!inst) {
    const { data: old } = await admin().from('slug_history').select('institute_id').eq('slug', slug).maybeSingle<{ institute_id: string }>();
    if (old) {
      const { data: cur } = await admin().from('institutes').select('slug').eq('id', old.institute_id).maybeSingle<{ slug: string }>();
      if (cur) { parts[1] = cur.slug; return redirectTo(parts.join('/'), Object.fromEntries(url.searchParams), 308); }
    }
    return redirectTo('/', { unknown: seg.slice(0, 40) });
  }
  if (seg !== inst.slug) { parts[1] = inst.slug; return redirectTo(parts.join('/'), Object.fromEntries(url.searchParams), 308); }

  const area = parts[2] ?? '';
  const home = `/${slug}`;

  // institute status gates
  if (inst.status === 'rejected') return redirectTo('/', { unknown: slug });
  if (!OPEN.has(inst.status)) {
    if (area === 'closed' || area === 'help') return response;
    if (uid) await signOut();
    const why = inst.status === 'lapsed' || inst.status === 'cancelled' ? 'closed' : 'not_open';
    return redirectTo(`${home}/closed`, { why });
  }
  if (area === '') return redirectTo(`${home}/login`);

  // who is this?
  type Member = { institute_id: string; role: string; status: string; current_session_id: string | null };
  let member: Member | null = null;
  if (uid) {
    const { data: m } = await admin().from('portal_users').select('institute_id, role, status, current_session_id').eq('id', uid).maybeSingle<Member>();
    member = m;
  }
  const mine = !!member && member.institute_id === inst.id && member.status === 'active';

  if (PUBLIC_SUB.has(area)) {
    // already signed in here? skip the sign-in page
    if (area === 'login' && mine && member!.current_session_id === claims?.session_id) {
      return redirectTo(`${home}/${HOME[member!.role]}`);
    }
    return response;
  }

  // everything else needs a signed-in member of this institute
  const loginWith = (reason?: string) => redirectTo(`${home}/login`, reason ? { reason } : { next: path + url.search });
  if (!uid) return loginWith();
  if (!member) { await signOut(); return loginWith('no_account'); }
  if (member.institute_id !== inst.id) { await signOut(); return loginWith('other_institute'); }
  if (member.status !== 'active') { await signOut(); return loginWith('archived'); }
  if (member.current_session_id && claims?.session_id !== member.current_session_id) {
    await signOut(); return loginWith('signed_in_elsewhere');
  }

  const needRole = AREA_ROLE[area];
  if (needRole && member.role !== needRole) return redirectTo(`${home}/${HOME[member.role]}`);

  if (inst.status === 'suspended' && member.role === 'student') {
    await signOut(); return redirectTo(`${home}/closed`, { why: 'suspended' });
  }

  // students count once per IST calendar month; the cookie saves the lookup on every page
  if (member.role === 'student') {
    const t = now();
    const mark = `${monthKey(t)}:${uid}`;
    if (request.cookies.get('sg_m')?.value !== mark) {
      const { data: r, error } = await admin().rpc('record_active_student', { p_institute: inst.id, p_student: uid, p_month: monthStart(t) } as never);
      if (!error && r === 'limit_reached') { await signOut(); return redirectTo(`${home}/login`, { reason: 'limit' }); }
      if (!error) response.cookies.set('sg_m', mark, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 40 });
    }
  }

  return inst.status === 'suspended' ? rewriteTo(path, { 'x-sg-readonly': '1' }) : response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)'],
};
