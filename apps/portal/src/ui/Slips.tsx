'use client';

import type { Slip } from '@/lib/students';
import s from './ui.module.css';

/* Login slips: institute URL, username and PIN. PINs are shown only here, once. */
export default function Slips({ slips, loginUrl, onClose }: { slips: Slip[]; loginUrl: string; onClose: () => void }) {
  const print = () => {
    document.body.classList.add('sg-printing');
    const off = () => { document.body.classList.remove('sg-printing'); window.removeEventListener('afterprint', off); };
    window.addEventListener('afterprint', off);
    window.print();
  };
  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Login slips">
      <div className={s.overlayInner}>
        <div className={`${s.between} ${s.noPrint}`} style={{ marginBottom: 16 }}>
          <div>
            <h2 className={s.h1}>Login slips</h2>
            <p className={s.lead}>Print these now or write them down. <b>PINs are shown only once</b>; you can always set a new PIN later.</p>
          </div>
          <div className={s.row}>
            <button className={s.btn} onClick={print}>Print slips</button>
            <button className={s.btnGhost} onClick={onClose}>Done</button>
          </div>
        </div>
        <div className={s.slips}>
          {slips.map(sl => (
            <div key={sl.username} className={s.slip}>
              <b>{sl.name}</b>{sl.batch && <span className={s.muted}> · {sl.batch}</span>}
              <dl>
                <dt>Go to</dt><dd>{loginUrl}</dd>
                <dt>Username</dt><dd>{sl.username}</dd>
                <dt>PIN</dt><dd className={s.slipPin}>{sl.pin}</dd>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
