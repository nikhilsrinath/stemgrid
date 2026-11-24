import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { isLocal } from '@/lib/mode';
import DevToolbar from '@/dev/DevToolbar';

export const metadata: Metadata = {
  title: 'StemGrid Portal',
  description: 'The StemGrid institute portal for admins, teachers and students.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Loaded by name (not next/font): the simulator engine draws "Poppins" onto canvas textures. No tracking scripts on the portal. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0 }}>
        {children}
        {isLocal() && <DevToolbar />}
      </body>
    </html>
  );
}
