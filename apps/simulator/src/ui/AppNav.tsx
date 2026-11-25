'use client';

import Link from 'next/link';
import BrandLogo from '@/ui/BrandLogo';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Viewer } from '@/lib/types';
import Avatar from './Avatar';
import s from './ui.module.css';
import { HOME_HREF, HOME_URL } from '@/lib/hosts';

/* Top bar for the account pages: logo, page links, avatar menu. */
export default function AppNav({ viewer }: { viewer: NonNullable<Viewer> }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    if (HOME_URL) { window.location.assign(HOME_URL); return; }
    router.push('/');
    router.refresh();
  };
  const here = (p: string) => (path === p ? 'page' : undefined);

  return (
    <nav className={s.appNav}>
      <div className={s.appNavIn}>
        <Link href="/projects" className={s.logo} aria-label="Your projects"><BrandLogo height={38} /><span className={s.beta}>Beta</span></Link>
        <div className={s.navLinks}>
          <Link href="/projects" aria-current={here('/projects')}>My projects</Link>
          <Link href="/profile" aria-current={here('/profile')}>Profile</Link>
        </div>
        <div className={s.navRight}>
          <div className={s.menuWrap} ref={box}>
            <button className={s.avatarBtn} onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
              <Avatar name={viewer.name} url={viewer.avatarUrl} size={38} />
            </button>
            {open && (
              <div className={s.menu} role="menu">
                <div className={s.menuWho}><b>{viewer.name}</b>{viewer.username && <span>@{viewer.username}</span>}</div>
                <Link role="menuitem" href="/projects" onClick={() => setOpen(false)}>My projects</Link>
                <Link role="menuitem" href="/profile" onClick={() => setOpen(false)}>Profile</Link>
                <Link role="menuitem" href={HOME_HREF} onClick={() => setOpen(false)}>StemGrid home</Link>
                <button role="menuitem" className={s.danger} onClick={signOut}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
