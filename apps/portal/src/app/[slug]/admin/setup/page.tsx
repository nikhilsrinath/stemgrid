import Link from 'next/link';
import { pageMember } from '@/lib/auth';
import { PageHead, s } from '@/ui/bits';
import { setupState } from './state';

export const metadata = { title: 'Set up · StemGrid' };

export default async function Setup({ params }: PageProps<'/[slug]/admin/setup'>) {
  const { institute: inst } = await pageMember((await params).slug, ['institute_admin']);
  const { items, done } = await setupState(inst);
  return (
    <div className={s.narrow}>
      <PageHead title={`Welcome, ${inst.name}`} lead="Four quick steps and your portal is ready for students." />
      <ol className={s.checklist}>
        {items.map((it, i) => (
          <li key={it.key}>
            <span className={s.tick} data-done={it.done}>{it.done ? '✓' : i + 1}</span>
            <span style={{ flex: 1 }}><b>{it.label}</b><br /><span className={`${s.small} ${s.muted}`}>{it.hint}</span></span>
            <Link className={it.done ? `${s.btnGhost} ${s.btnSmall}` : `${s.btn} ${s.btnSmall}`} href={it.href}>{it.done ? 'Edit' : 'Start'}</Link>
          </li>
        ))}
      </ol>
      <p style={{ marginTop: 20 }}>{done ? <span className={s.okBox}>All set. Students can now sign in at your portal address.</span> : null}</p>
      <p style={{ marginTop: 12 }}><Link className={s.btnGhost} href={`/${inst.slug}/admin/dashboard`}>Go to the dashboard</Link></p>
    </div>
  );
}
