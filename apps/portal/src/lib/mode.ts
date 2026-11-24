/* Local testing mode (brief §19.4). Every fake service checks this, and it can never be on in
   production: it needs PORTAL_MODE=local AND a non-production NODE_ENV, and scripts/guard-build.mjs
   fails any production build that has PORTAL_MODE=local set. */
export function isLocal() {
  return process.env.PORTAL_MODE === 'local' && process.env.NODE_ENV !== 'production';
}
