/* Dates for people are shown and reasoned about in IST (UTC+5:30, no daylight saving).
   Stored values are UTC timestamptz. */
const IST_MS = 330 * 60_000;
const DAY = 86_400_000;

const ist = (d: Date) => new Date(d.getTime() + IST_MS);   // a Date whose UTC fields read as IST
const fromIst = (d: Date) => new Date(d.getTime() - IST_MS);

/* First day of the IST calendar month, as 'YYYY-MM-01' (the monthly_active_students key). */
export function monthStart(d: Date) {
  const x = ist(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
export const monthKey = (d: Date) => monthStart(d).slice(0, 7);
export function prevMonthStart(d: Date) {
  const x = ist(d);
  const p = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() - 1, 1));
  return `${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, '0')}-01`;
}
export const istDay = (d: Date) => ist(d).getUTCDate();

/* Same IST wall-clock time, n calendar months later (day clamped to the month's length). */
export function addMonths(d: Date, n: number) {
  const x = ist(d);
  const day = x.getUTCDate();
  const t = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + n, 1, x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds()));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return fromIst(t);
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/* Whole IST calendar days from a to b (b later = positive). */
export function daysBetween(a: Date, b: Date) {
  const da = Date.UTC(ist(a).getUTCFullYear(), ist(a).getUTCMonth(), ist(a).getUTCDate());
  const db = Date.UTC(ist(b).getUTCFullYear(), ist(b).getUTCMonth(), ist(b).getUTCDate());
  return Math.round((db - da) / DAY);
}

/* Indian financial year (April to March), e.g. '2026-27'. */
export function financialYear(d: Date) {
  const x = ist(d);
  const y = x.getUTCMonth() >= 3 ? x.getUTCFullYear() : x.getUTCFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

const asDate = (v: Date | string) => (typeof v === 'string' ? new Date(v) : v);
export function fmtDate(v: Date | string | null | undefined) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(asDate(v));
}
export function fmtDateTime(v: Date | string | null | undefined) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(asDate(v));
}
export function fmtMonth(v: Date | string) {
  // 'YYYY-MM-01' strings are IST calendar months: read them as dates at IST midnight
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00+05:30') : asDate(v);
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' }).format(d);
}
/* An IST date-only input value (YYYY-MM-DD) for <input type="date">. */
export function isoDay(d: Date) {
  const x = ist(d);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}
/* Midday IST on an IST calendar day (avoids off-by-one when shown in IST). */
export const istNoon = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T12:00:00+05:30`);
