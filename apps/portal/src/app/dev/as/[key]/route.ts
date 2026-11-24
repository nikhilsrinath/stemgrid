import { NextResponse, type NextRequest } from 'next/server';
import { isLocal } from '@/lib/mode';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { countStudent, finishSignIn } from '@/lib/signin';
import { pinPassword, studentEmail } from '@/lib/rules';
import accounts from '../../../../../dev/demo-accounts.json';

/* Local mode only: one-click sign-in as a seeded demo account (the dev toolbar's "Switch user"). */
export async function GET(request: NextRequest, { params }: RouteContext<'/dev/as/[key]'>) {
  if (!isLocal()) return new NextResponse('Not found', { status: 404 });
  const { key } = await params;
  const a = accounts.find(x => x.key === key);
  if (!a) return new NextResponse('Unknown demo account', { status: 404 });
  const host = (request.headers.get('host') ?? '').toLowerCase();
  const onAdmin = host.startsWith('admin.');
  const want = a.host === 'admin';
  const origin = want ? (process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://admin.localhost:3002') : (process.env.NEXT_PUBLIC_PORTAL_URL || 'http://learn.localhost:3002');
  if (onAdmin !== want) return NextResponse.redirect(`${origin}/dev/as/${key}`);

  const sb = await supabaseServer();
  await sb.auth.signOut({ scope: 'local' });
  let email = a.email;
  let instituteId: string | null = null;
  if (a.username) {
    const { data: inst } = await supabaseAdmin().from('institutes').select('id').eq('slug', a.slug!).single();
    instituteId = inst!.id; email = studentEmail(a.username, instituteId!);
  }
  const { data, error } = await sb.auth.signInWithPassword({ email: email!, password: a.password ?? pinPassword(a.pin!) });
  if (error || !data.session) return new NextResponse(`Couldn't sign in as ${a.label}: ${error?.message}. Try "Reset demo data".`, { status: 500 });
  const isStaff = a.host === 'admin';
  await finishSignIn(sb, data.session, isStaff ? null : data.user.id);
  if (instituteId && !(await countStudent(instituteId, data.user.id))) {
    await sb.auth.signOut({ scope: 'local' });
    return NextResponse.redirect(`${origin}/${a.slug}/login?reason=limit`);
  }
  return NextResponse.redirect(`${origin}${a.home}`);
}
