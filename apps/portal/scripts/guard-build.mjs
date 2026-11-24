// Fails a production build if local testing mode is switched on (brief §19.4).
// Checks the environment and every .env file Next.js loads for `next build`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bad = [];
if (process.env.PORTAL_MODE === 'local') bad.push('the PORTAL_MODE environment variable');
for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  const p = path.join(root, f);
  if (fs.existsSync(p) && /^\s*PORTAL_MODE\s*=\s*["']?local/m.test(fs.readFileSync(p, 'utf8'))) bad.push(f);
}
for (const [k, v] of [['PAYMENTS_PROVIDER', 'mock'], ['ENQUIRIES_SOURCE', 'fixtures']]) if (process.env[k] === v) bad.push(`${k}=${v}`);
if (bad.length) {
  console.error(`\n✗ Refusing to build: local testing mode is set in ${bad.join(', ')}.\n  Local mode (fake payments, fake emails) must never reach production.\n`);
  process.exit(1);
}
