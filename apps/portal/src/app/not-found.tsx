import Link from 'next/link';
import { Mark, s } from '@/ui/bits';

export default function NotFound() {
  return (
    <div className={s.root}>
      <div className={s.centered}>
        <div className={s.authCard} style={{ textAlign: 'center' }}>
          <div className={s.authHead}><Mark /><h1 className={s.h1}>Page not found</h1></div>
          <p className={s.muted}>That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
          <p style={{ marginTop: 18 }}><Link className={s.btnGhost} href="/">Find your institute</Link></p>
        </div>
      </div>
    </div>
  );
}
