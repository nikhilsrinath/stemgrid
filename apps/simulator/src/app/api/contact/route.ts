import { createClient } from '@supabase/supabase-js';

/* The business contact form on lab.stemgrid.in posts here (the marketing site is static, so it has
   no server of its own). Stores the message in public.business_contacts, then emails the team
   through Resend when RESEND_API_KEY, ENQUIRY_NOTIFY_TO and ENQUIRY_NOTIFY_FROM are set. */

const ORIGINS = new Set(['https://lab.stemgrid.in', 'https://stemgrid.in', 'https://www.stemgrid.in', 'http://localhost:4321']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const extra = process.env.CONTACT_ALLOWED_ORIGIN;            // e.g. a Vercel preview of the site
  const ok = ORIGINS.has(origin) || (!!extra && origin === extra);
  return {
    'Access-Control-Allow-Origin': ok ? origin : 'https://lab.stemgrid.in',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const reply = (req: Request, status: number, body: object) => Response.json(body, { status, headers: cors(req) });

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req) });
}

export async function POST(req: Request) {
  let f: Record<string, unknown>;
  try { f = await req.json(); } catch { return reply(req, 400, { error: 'Send the form as JSON.' }); }
  const s = (k: string, max: number) => (typeof f[k] === 'string' ? (f[k] as string).trim().slice(0, max) : '');

  if (s('company_fax', 100)) return reply(req, 200, { ok: true });   // honeypot: bots fill every box

  const row = {
    name: s('name', 80),
    company: s('company', 120),
    email: s('email', 160).toLowerCase(),
    phone: s('phone', 20) || null,
    message: s('message', 2000),
  };
  if (row.name.length < 2) return reply(req, 422, { error: 'Tell us your name.' });
  if (row.company.length < 2) return reply(req, 422, { error: 'Add your company or organisation.' });
  if (!EMAIL.test(row.email)) return reply(req, 422, { error: "That email address doesn't look right." });
  if (row.phone && !PHONE.test(row.phone)) return reply(req, 422, { error: 'Check the phone number, or leave it empty.' });
  if (row.message.length < 5) return reply(req, 422, { error: 'Tell us a little about what you need.' });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from('business_contacts').insert(row);
  if (error) {
    console.error('business contact insert failed', error);
    return reply(req, 500, { error: "We couldn't send that just now. Try again in a moment, or call us on +91 89251 72636." });
  }
  await notifyTeam(row).catch(e => console.error('business contact email failed', e));
  return reply(req, 200, { ok: true, name: row.name.split(/\s+/)[0] });
}

async function notifyTeam(r: { name: string; company: string; email: string; phone: string | null; message: string }) {
  const key = process.env.RESEND_API_KEY, to = process.env.ENQUIRY_NOTIFY_TO, from = process.env.ENQUIRY_NOTIFY_FROM;
  if (!key || !to || !from) return;
  const esc = (v: unknown) => String(v ?? '—').replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const rows: [string, unknown][] = [['Name', r.name], ['Company', r.company], ['Email', r.email], ['Phone', r.phone], ['Message', r.message]];
  const html = `<h2>New business contact from lab.stemgrid.in</h2><table cellpadding="6" style="border-collapse:collapse;font:14px sans-serif">${
    rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${k}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map(x => x.trim()), reply_to: r.email, subject: `New contact: ${r.company} (${r.name})`, html }),
  });
  if (!res.ok) console.error('business contact email failed', res.status, await res.text().catch(() => ''));
}
