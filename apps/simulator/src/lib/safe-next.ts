/* Only allow same-site relative paths as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = '/projects') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
