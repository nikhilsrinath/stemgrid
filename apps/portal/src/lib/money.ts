/* Money is integer paise everywhere. Prices exclude 18% GST. */
export const GST_RATE = 18;
export const gstOn = (paise: number) => Math.round((paise * GST_RATE) / 100);

const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

/* ₹1,20,000 (Indian digit grouping); shows paise only when there are some. */
export function inr(paise: number | null | undefined) {
  if (paise == null) return '—';
  return paise % 100 === 0 ? whole.format(paise / 100) : exact.format(paise / 100);
}
/* For PDFs: the standard PDF fonts have no ₹ glyph. */
export function rs(paise: number) {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(paise / 100);
}
