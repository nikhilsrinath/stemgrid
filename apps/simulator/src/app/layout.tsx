import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ViewportGuard from './ViewportGuard';

export const metadata: Metadata = {
  title: 'StemGrid Beta',
  description: 'Build, wire and code the StemGrid Quark kit in your browser.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* Loaded by name (not next/font) because the simulator also draws "Poppins" onto canvas textures. The landing page uses Plus Jakarta Sans; Big Shoulders Display + Lexend are still used by the account pages. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600;1,700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&family=Big+Shoulders+Display:wght@700;800;900&family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0 }}><ViewportGuard />{children}</body>
    </html>
  );
}
