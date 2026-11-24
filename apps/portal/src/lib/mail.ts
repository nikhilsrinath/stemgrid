import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isLocal } from '@/lib/mode';
import { now } from '@/lib/clock';

export type Mail = { to: string; subject: string; text: string };
export type StoredMail = Mail & { id: string; at: string };

export const MAILBOX_FILE = path.join(process.cwd(), 'dev', '.mailbox.json');

export function readMailbox(): StoredMail[] {
  try { return JSON.parse(fs.readFileSync(MAILBOX_FILE, 'utf8')) as StoredMail[]; } catch { return []; }
}

/* Sends an email. In local mode nothing leaves the laptop: the mail is stored and shown at /dev/mail.
   Otherwise it goes through Resend (same pattern as the simulator's enquiry notifications).
   Never throws: a failed email must not undo a payment or an approval; it is logged instead. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (isLocal()) {
    const box = readMailbox();
    box.unshift({ ...mail, id: randomUUID(), at: now().toISOString() });
    fs.mkdirSync(path.dirname(MAILBOX_FILE), { recursive: true });
    fs.writeFileSync(MAILBOX_FILE, JSON.stringify(box.slice(0, 300), null, 2));
    return true;
  }
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) { console.error('[mail] RESEND_API_KEY / MAIL_FROM not set; not sent:', mail.subject); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
    if (!r.ok) console.error('[mail] Resend error', r.status, await r.text().catch(() => ''));
    return r.ok;
  } catch (e) {
    console.error('[mail] send failed', e);
    return false;
  }
}

export async function notifyStaff(subject: string, text: string) {
  const to = process.env.STAFF_NOTIFY_TO || (isLocal() ? 'team@stemgrid.local' : '');
  if (to) await sendMail({ to, subject: `[Portal] ${subject}`, text });
}
