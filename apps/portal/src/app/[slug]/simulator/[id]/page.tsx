import { notFound } from 'next/navigation';
import { pageMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ROLE_LABEL, type BuildData } from '@/lib/types';
import PortalSimulatorHost from '@/simulator/PortalSimulatorHost';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* /<slug>/simulator/<id>: open a saved build. RLS decides who may read it: the owner, teachers of
   the owner's batches, and the institute's admins. Anyone else gets the same 404 as a missing id. */
export default async function OpenBuild({ params }: PageProps<'/[slug]/simulator/[id]'>) {
  const { slug, id } = await params;
  const { sb, user, institute: inst } = await pageMember(slug);
  if (!UUID.test(id)) notFound();
  const { data: p } = await sb.from('student_projects').select('id, name, data, owner_id').eq('id', id).maybeSingle<{ id: string; name: string; data: BuildData; owner_id: string }>();
  if (!p) notFound();
  const readOnly = p.owner_id !== user.id;
  let ownerName: string | undefined;
  if (readOnly) {
    const { data: o } = await supabaseAdmin().from('portal_users').select('display_name').eq('id', p.owner_id).maybeSingle();
    ownerName = o?.display_name;
  }
  return (
    <PortalSimulatorHost
      slug={inst.slug}
      readOnly={readOnly}
      project={{ id: p.id, name: p.name, data: p.data, ownerName }}
      viewer={{ id: user.id, name: user.display_name, sub: user.username ?? ROLE_LABEL[user.role], instituteId: inst.id, instituteName: inst.name, role: user.role }}
    />
  );
}
