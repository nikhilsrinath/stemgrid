import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, getMember, getStaff } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createInvoice } from '@/lib/invoices';

/* Invoice PDF download: the institute's admins, or StemGrid staff. Served through a short signed URL. */
export async function GET(_req: NextRequest, { params }: RouteContext<'/api/invoices/[id]'>) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });
  const { uid } = await getAuth();
  if (!uid) return new NextResponse('Please sign in', { status: 401 });
  const db = supabaseAdmin();
  const { data: inv } = await db.from('invoices').select('id, institute_id, payment_id, pdf_path').eq('id', id).maybeSingle();
  if (!inv) return new NextResponse('Not found', { status: 404 });
  const [member, staff] = await Promise.all([getMember(), getStaff()]);
  const allowed = !!staff || (member?.status === 'active' && member.role === 'institute_admin' && member.institute_id === inv.institute_id);
  if (!allowed) return new NextResponse('Not found', { status: 404 });
  let path = inv.pdf_path as string | null;
  if (!path) path = (await createInvoice(inv.payment_id)).pdf_path;
  const { data } = await db.storage.from('invoices').createSignedUrl(path!, 60, { download: true });
  if (!data?.signedUrl) return new NextResponse('Not available', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
