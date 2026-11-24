import { Mark, s } from '@/ui/bits';
import { isLocal } from '@/lib/mode';
import StaffLogin from './StaffLogin';

export const metadata = { title: 'Console sign-in · StemGrid' };

export default async function ConsoleLogin({ searchParams }: PageProps<'/console/login'>) {
  const next = String((await searchParams).next ?? '');
  return (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={s.authCard}>
          <div className={s.authHead}>
            <Mark />
            <h1 className={s.h1}>StemGrid console</h1>
            <p className={s.muted}>For the StemGrid team only.</p>
          </div>
          <StaffLogin next={next} skipTotp={isLocal()} />
        </div>
      </div>
    </div>
  );
}
