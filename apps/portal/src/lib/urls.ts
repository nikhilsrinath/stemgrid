import { isLocal } from '@/lib/mode';

/* Public origins for links in emails and redirects between the two hosts. */
export const portalOrigin = () =>
  (process.env.NEXT_PUBLIC_PORTAL_URL || (isLocal() ? 'http://learn.localhost:3002' : 'https://learn.stemgrid.in')).replace(/\/$/, '');
export const consoleOrigin = () =>
  (process.env.NEXT_PUBLIC_CONSOLE_URL || (isLocal() ? 'http://admin.localhost:3002' : 'https://admin.stemgrid.in')).replace(/\/$/, '');
export const simulatorOrigin = () =>
  (process.env.NEXT_PUBLIC_SIMULATOR_URL || 'https://simulator.stemgrid.in').replace(/\/$/, '');

export const CONTACT = { email: 'info@stemgrid.in', phone: '+91 89251 72636', tel: 'tel:+918925172636' };
