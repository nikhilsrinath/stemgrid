import type { Viewport } from 'next';
import type { ReactNode } from 'react';

/* The simulator is a full-screen app: on iPads and tablets the page itself must not zoom.
   Pinching zooms the 3D table instead (engine.js), and maximum-scale stops iPad Safari
   zooming the page in when a student taps into the code editor or the parts search. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return children;
}
