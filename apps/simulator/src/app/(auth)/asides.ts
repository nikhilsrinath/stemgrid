import type { AuthAside } from '@/ui/AuthSplit';

/* Left-panel copy for the server-rendered auth pages (kept out of the 'use client' forms file,
   whose exports are client references on the server). */
export const LOGIN_ASIDE: AuthAside = {
  title: 'Welcome back to the bench',
  steps: ['Drag modules onto the plate', 'Wire them with Zap cables', 'Code the Quark in Python'],
  active: -1,
};

export const PASSWORD_ASIDE = (active: number): AuthAside => ({
  title: 'Locked out? It happens.',
  steps: ['Enter your email', 'Open the link we send', 'Pick a new password'],
  active,
});
