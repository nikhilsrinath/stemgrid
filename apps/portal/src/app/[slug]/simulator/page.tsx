import { pageMember } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/types';
import PortalSimulatorHost from '@/simulator/PortalSimulatorHost';

export const metadata = { title: 'Simulator · StemGrid' };

/* /<slug>/simulator: a new build, saved to the portal on the first change. */
export default async function NewBuild({ params }: PageProps<'/[slug]/simulator'>) {
  const { user, institute: inst } = await pageMember((await params).slug);
  return (
    <PortalSimulatorHost
      slug={inst.slug}
      viewer={{ id: user.id, name: user.display_name, sub: user.username ?? ROLE_LABEL[user.role], instituteId: inst.id, instituteName: inst.name, role: user.role }}
    />
  );
}
