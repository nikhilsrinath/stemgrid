/* Only allow same-site relative paths as a post-login destination (no open redirects), and,
   inside the portal, only paths of the same institute. */
export function safeNext(next: string | null | undefined, fallback: string, slug?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (slug) {
    const first = next.split(/[/?#]/)[1]?.toLowerCase();
    if (first !== slug.toLowerCase()) return fallback;
  }
  return next;
}
