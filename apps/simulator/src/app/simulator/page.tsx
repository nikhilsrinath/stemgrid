'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startSimulator } from '@/simulator/engine';
import styles from '@/simulator/styles';
import markup from '@/simulator/markup';

// The simulator is the original imperative Three.js app. React only gives it a host element:
// on mount we add its stylesheet and markup, then start the engine. On unmount we stop it and
// remove both, so its global CSS (html/body/button) never leaks onto other pages.
export default function SimulatorPage() {
  const host = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const style = document.createElement('style');
    style.dataset.stemgrid = 'simulator';
    style.textContent = styles;
    document.head.appendChild(style);
    el.innerHTML = markup;

    const stop = startSimulator();

    const homeBtn = el.querySelector<HTMLButtonElement>('#homeBtn');
    const goHome = () => router.push('/');
    homeBtn?.addEventListener('click', goHome);

    return () => {
      homeBtn?.removeEventListener('click', goHome);
      stop();
      el.innerHTML = '';
      style.remove();
    };
  }, [router]);

  return <div ref={host} />;
}
