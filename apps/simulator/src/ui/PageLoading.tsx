import AppNav from '@/ui/AppNav';
import s from '@/ui/ui.module.css';

/* Shown the moment a link is clicked, while the next account page loads on the server.
   Next prefetches it with the link, so the click answers instantly. */
export default function PageLoading() {
  return (
    <div className={`${s.root} ${s.app}`} aria-busy="true">
      <AppNav />
      <main className={s.wrap}>
        <span className={s.srOnly} role="status">Loading</span>
        <div className={s.head}>
          <div style={{ display: 'grid', gap: 12, width: 'min(420px, 100%)' }}>
            <div className={s.skel} style={{ height: 30, width: '55%' }} />
            <div className={s.skel} style={{ height: 14 }} />
          </div>
        </div>
        <div className={s.skelGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={s.skelCard}>
              <div className={s.skel} style={{ aspectRatio: '16 / 10', borderRadius: 0 }} />
              <div className={s.skel} style={{ height: 14, margin: '4px 16px 0', width: '60%' }} />
              <div className={s.skel} style={{ height: 12, margin: '0 16px', width: '85%' }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
