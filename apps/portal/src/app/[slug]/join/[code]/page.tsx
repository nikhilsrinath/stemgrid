import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInstituteBySlug, getMember } from '@/lib/auth';
import InstituteFrame from '@/ui/InstituteFrame';
import { ActionForm, Submit } from '@/ui/Form';
import { s } from '@/ui/bits';
import { joinWithCode } from '../actions';
import { findBatch } from '@/lib/batches';
import SelfJoin from './SelfJoin';

export default async function JoinCode({ params }: PageProps<'/[slug]/join/[code]'>) {
  const { slug, code } = await params;
  const inst = await getInstituteBySlug(slug);
  if (!inst) notFound();
  const batch = await findBatch(inst.id, code);
  const me = await getMember();
  const isStudentHere = !!me && me.role === 'student' && me.institute_id === inst.id && me.status === 'active';

  if (!batch) {
    return (
      <InstituteFrame inst={inst} title="Join a batch">
        <p className={s.warnBox}>That code didn&apos;t work. It may have expired, or the batch has ended. Check it with your teacher.</p>
        <p style={{ marginTop: 14, textAlign: 'center' }}><Link className={s.btnGhost} href={`/${inst.slug}/join`}>Try another code</Link></p>
      </InstituteFrame>
    );
  }
  return (
    <InstituteFrame inst={inst} title={`Join ${batch.name}`}>
      {isStudentHere ? (
        <ActionForm action={joinWithCode.bind(null, inst.slug)}>
          <input type="hidden" name="code" value={batch.join_code} />
          <p>Signed in as <b>{me!.display_name}</b>.</p>
          <Submit className={`${s.btn} ${s.full}`}>Join {batch.name}</Submit>
          <p className={s.small} style={{ textAlign: 'center' }}><Link href={`/${inst.slug}/student/home`}>Go to my home</Link></p>
        </ActionForm>
      ) : batch.self_join ? (
        <SelfJoin slug={inst.slug} code={batch.join_code} />
      ) : (
        <div className={s.stack} style={{ textAlign: 'center' }}>
          <p>New students in this batch are added by the teacher. Ask your teacher for your username and PIN.</p>
          <p className={s.muted}>Already have an account at {inst.name}?</p>
          <Link className={s.btn} href={`/${inst.slug}/login?next=${encodeURIComponent(`/${inst.slug}/join/${batch.join_code}`)}`}>Sign in to join</Link>
        </div>
      )}
    </InstituteFrame>
  );
}
