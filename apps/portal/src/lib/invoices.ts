import 'server-only';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { now } from '@/lib/clock';
import { financialYear, fmtDate } from '@/lib/dates';
import { rs } from '@/lib/money';
import type { Institute } from '@/lib/types';

/* GST invoice per payment (brief §11.3). Number SG/<FY>/<0001>, sequential per financial year.
   CGST + SGST when the buyer is in the seller's state, IGST otherwise. */

const DESCRIPTION: Record<string, string> = {
  joining: 'StemGrid membership: first month + onboarding (bundled)',
  monthly: 'StemGrid simulator subscription: monthly plan',
  addon: 'StemGrid add-on: extra students / teacher accounts',
};

const seller = () => ({
  name: process.env.INVOICE_SELLER_NAME || 'StemGrid',
  gstin: process.env.INVOICE_SELLER_GSTIN || '',
  address: process.env.INVOICE_SELLER_ADDRESS || '',
  state: process.env.INVOICE_SELLER_STATE || '',
  sac: process.env.INVOICE_SAC_CODE || '998431',
});

const sameState = (a: string, b: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export type Invoice = {
  id: string; institute_id: string; payment_id: string; number: string; amount_paise: number; gst_paise: number;
  cgst_paise: number; sgst_paise: number; igst_paise: number; buyer: Record<string, string>; description: string;
  issued_at: string; pdf_path: string | null;
};

export async function createInvoice(paymentId: string): Promise<Invoice> {
  const db = supabaseAdmin();
  const { data: existing } = await db.from('invoices').select('*').eq('payment_id', paymentId).maybeSingle<Invoice>();
  if (existing?.pdf_path) return existing;

  const { data: pay } = await db.from('payments').select('*').eq('id', paymentId).single();
  const { data: inst } = await db.from('institutes').select('*').eq('id', pay.institute_id).single<Institute>();
  if (!pay || !inst) throw new Error('Payment or institute missing');

  let inv = existing;
  if (!inv) {
    const issued = pay.paid_at ? new Date(pay.paid_at) : now();
    const fy = financialYear(issued);
    const { data: seq, error: e1 } = await db.rpc('next_invoice_number', { p_fy: fy });
    if (e1) throw e1;
    const number = `SG/${fy}/${String(seq).padStart(4, '0')}`;
    const s = seller();
    const intra = sameState(inst.state, s.state);
    const gst = pay.gst_paise as number;
    const half = Math.floor(gst / 2);
    const row = {
      institute_id: inst.id, payment_id: pay.id, number, amount_paise: pay.amount_paise, gst_paise: gst,
      cgst_paise: intra ? half : 0, sgst_paise: intra ? gst - half : 0, igst_paise: intra ? 0 : gst,
      buyer: { name: inst.name, address: [inst.address, inst.city, inst.state].filter(Boolean).join(', '), gstin: inst.gst_number, state: inst.state, email: inst.contact_email },
      description: DESCRIPTION[pay.kind] ?? 'StemGrid services', issued_at: issued.toISOString(),
    };
    const { data, error } = await db.from('invoices').insert(row).select('*').single<Invoice>();
    if (error) {
      // another request created it first (unique payment_id): use theirs
      const { data: again } = await db.from('invoices').select('*').eq('payment_id', paymentId).single<Invoice>();
      if (!again) throw error;
      inv = again;
    } else inv = data;
  }

  const pdf = await renderInvoicePdf(inv!);
  const path = `${inv!.institute_id}/${inv!.number.replace(/\//g, '-')}.pdf`;
  const { error: up } = await db.storage.from('invoices').upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (up) throw up;
  await db.from('invoices').update({ pdf_path: path }).eq('id', inv!.id);
  return { ...inv!, pdf_path: path };
}

export async function renderInvoicePdf(inv: Invoice) {
  const s = seller();
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);              // A4 portrait, points
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const red = rgb(0.89, 0.07, 0.11), ink = rgb(0.1, 0.1, 0.1), dim = rgb(0.4, 0.4, 0.42);
  const clean = (t: string) => t.replace(/[^\x20-\x7E]/g, '');   // standard fonts: plain ASCII only
  const text = (t: string, x: number, y: number, o: { size?: number; b?: boolean; color?: typeof ink; right?: boolean } = {}) => {
    const f = o.b ? bold : font, size = o.size ?? 10, str = clean(t);
    page.drawText(str, { x: o.right ? x - f.widthOfTextAtSize(str, size) : x, y, size, font: f, color: o.color ?? ink });
  };

  text('stemGRID', 50, 780, { size: 22, b: true, color: red });
  text('TAX INVOICE', 545, 784, { size: 16, b: true, right: true });
  text(`Invoice no. ${inv.number}`, 545, 766, { right: true, color: dim });
  text(`Date ${fmtDate(inv.issued_at)}`, 545, 752, { right: true, color: dim });

  let y = 712;
  text('From', 50, y, { b: true, color: dim, size: 9 }); text('Bill to', 310, y, { b: true, color: dim, size: 9 });
  y -= 16;
  const left = [s.name, ...wrap(s.address, 42), s.state ? `State: ${s.state}` : '', s.gstin ? `GSTIN: ${s.gstin}` : ''].filter(Boolean);
  const right = [inv.buyer.name, ...wrap(inv.buyer.address ?? '', 42), inv.buyer.gstin ? `GSTIN: ${inv.buyer.gstin}` : 'GSTIN: not provided', inv.buyer.email ?? ''].filter(Boolean);
  left.forEach((l, i) => text(l, 50, y - i * 14, { b: i === 0 }));
  right.forEach((l, i) => text(l, 310, y - i * 14, { b: i === 0 }));
  y -= Math.max(left.length, right.length) * 14 + 30;

  page.drawRectangle({ x: 50, y: y - 6, width: 495, height: 22, color: rgb(0.96, 0.96, 0.97) });
  text('Description', 58, y, { b: true }); text('SAC', 380, y, { b: true }); text('Amount', 537, y, { b: true, right: true });
  y -= 26;
  text(inv.description, 58, y); text(s.sac, 380, y); text(rs(inv.amount_paise), 537, y, { right: true });
  y -= 34;

  const line = (label: string, v: number, b = false) => { text(label, 380, y, { b }); text(rs(v), 537, y, { right: true, b }); y -= 18; };
  line('Taxable value', inv.amount_paise);
  if (inv.igst_paise) line('IGST @ 18%', inv.igst_paise);
  else { line('CGST @ 9%', inv.cgst_paise); line('SGST @ 9%', inv.sgst_paise); }
  page.drawLine({ start: { x: 380, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 0.8, color: dim });
  y -= 4;
  line('Total', inv.amount_paise + inv.gst_paise, true);

  text('Amounts in Indian Rupees. This is a computer-generated invoice and needs no signature.', 50, 70, { size: 8.5, color: dim });
  text('StemGrid · info@stemgrid.in · +91 89251 72636', 50, 56, { size: 8.5, color: dim });
  return await doc.save();
}

function wrap(t: string, n: number) {
  const out: string[] = []; let cur = '';
  for (const w of t.split(/\s+/).filter(Boolean)) {
    if ((cur + ' ' + w).trim().length > n) { if (cur) out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}
