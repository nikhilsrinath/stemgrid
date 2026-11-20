/* Waitlist sign-ups. Appends "email,ISO time" to data/waitlist.csv (git-ignored).
   This is local file storage: fine for `npm run dev` / `npm start` on one machine, but it
   won't persist on serverless hosting. Swap writeSignup() for a real store before deploying. */

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'waitlist.csv');
const EMAIL = /^[^\s@,"]+@[^\s@,"]+\.[^\s@,"]+$/;

async function writeSignup(email: string) {
  await mkdir(DIR, { recursive: true });
  const existing = await readFile(FILE, 'utf8').catch(() => '');
  if (existing.split('\n').some(line => line.split(',')[0] === email)) return;
  // a leading = + - @ would be read as a formula by spreadsheet apps
  const safe = /^[=+\-@]/.test(email) ? `'${email}` : email;
  await appendFile(FILE, `${safe},${new Date().toISOString()}\n`);
}

export async function POST(req: Request) {
  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
  } catch { /* not JSON */ }
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  try {
    await writeSignup(email);
  } catch {
    return Response.json({ error: 'Could not save the sign-up.' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
