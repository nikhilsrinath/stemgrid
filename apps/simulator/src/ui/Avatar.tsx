import { initials } from '@/lib/types';
import type { CSSProperties } from 'react';
import s from './ui.module.css';

export default function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  return (
    <span className={s.avatar} style={{ '--s': `${size}px` } as CSSProperties} aria-hidden="true">
      {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}
