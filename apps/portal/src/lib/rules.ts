import { randomInt } from 'node:crypto';

/* ---------------------------------------------------------------- slugs (brief §8.2) */
export const SLUG_RE = /^[a-z][a-z0-9-]{2,39}$/;
export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'Use 3–40 lowercase letters, digits and hyphens, starting with a letter.';
  if (slug.endsWith('-') || slug.includes('--')) return 'No hyphen at the end, and no double hyphens.';
  return null;
}
export const suggestSlug = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+/, '').replace(/-+$/, '').slice(0, 40).replace(/-+$/, '') || 'institute';

/* ---------------------------------------------------------------- usernames */
export const USERNAME_RE = /^[a-z][a-z0-9-]{1,29}$/;
/* "Ravi Kumar" → "ravi-k" (firstname-lastinitial), the base for deduplication. */
export function usernameBase(displayName: string) {
  const words = displayName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  let first = (words[0] ?? 'student').replace(/^[^a-z]+/, '') || 'student';
  first = first.slice(0, 20);
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return last ? `${first}-${last}` : first;
}
/* First free name: ravi-k, ravi-k2, ravi-k3, ... */
export function dedupeUsername(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 10000; i++) {
    const u = `${base}${i}`.slice(0, 30);
    if (!taken.has(u)) return u;
  }
  return `${base.slice(0, 20)}-${randomInt(100000, 999999)}`;
}

/* ---------------------------------------------------------------- PINs (brief §7.2) */
export const PIN_RE = /^\d{6}$/;
export function weakPin(pin: string) {
  if (!PIN_RE.test(pin)) return true;
  if (/^(\d)\1{5}$/.test(pin)) return true;                       // 000000, 777777
  const d = pin.split('').map(Number);
  const asc = d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10);
  const desc = d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10);
  if (asc || desc) return true;                                    // 123456, 654321, 789012
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin)) return true; // 121212, 123123
  return false;
}
export function newPin() {
  for (;;) {
    const p = String(randomInt(0, 1_000_000)).padStart(6, '0');
    if (!weakPin(p)) return p;
  }
}

/* ---------------------------------------------------------------- batch join codes */
export const JOIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I
export const JOIN_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export const newJoinCode = () => Array.from({ length: 6 }, () => JOIN_ALPHABET[randomInt(0, JOIN_ALPHABET.length)]).join('');
export const cleanJoinCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/* The Supabase password behind a student's 6-digit PIN. The project is shared with the simulator,
   whose minimum password length is 8, so the PIN gets a fixed prefix. Students only ever type the PIN.
   (scripts/seed-demo.mjs repeats this rule.) */
export const pinPassword = (pin: string) => `sgpin-${pin}`;

/* Students have no email: their Supabase login is a synthetic address that can never receive mail. */
export const studentEmail = (username: string, instituteId: string) => `${username.toLowerCase()}@${instituteId}.students.invalid`;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const cleanText = (v: FormDataEntryValue | null, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
