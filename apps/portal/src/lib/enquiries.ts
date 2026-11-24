import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLocal } from '@/lib/mode';

/* Reads the institution enquiries collected by the simulator's existing form (brief §6).
   The simulator project's table is never changed: this module only reads rows and updates the
   existing `status` and `notes` columns with values the table already allows.
   In local mode (ENQUIRIES_SOURCE=fixtures) it reads dev/enquiries.json instead and writes status
   changes to a local copy, so no live database is touched. */
export type EnquiryStatus = 'new' | 'contacted' | 'meeting' | 'proposal' | 'won' | 'lost' | 'spam';
export const ENQUIRY_STATUSES: EnquiryStatus[] = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'spam'];

export type Enquiry = {
  ref: string; org_name: string; org_type: string; curriculum: string | null; website: string | null;
  city: string; region: string; country: string; learners: string; levels: string[];
  contact_name: string; designation: string; email: string; phone: string;
  channel: string | null; best_time: string | null; interests: string[]; current_setup: string | null;
  timeline: string; decision_role: string | null; budget: string | null; heard_from: string | null;
  message: string; status: EnquiryStatus; notes: string; created_at: string;
};
const COLS = 'ref, org_name, org_type, curriculum, website, city, region, country, learners, levels, contact_name, designation, email, phone, channel, best_time, interests, current_setup, timeline, decision_role, budget, heard_from, message, status, notes, created_at';

const useFixtures = () => isLocal() && process.env.ENQUIRIES_SOURCE === 'fixtures';
const FIXTURES = path.join(process.cwd(), 'dev', 'enquiries.json');
const LOCAL_COPY = path.join(process.cwd(), 'dev', '.enquiries.local.json');

function readFixtures(): Enquiry[] {
  try { return JSON.parse(fs.readFileSync(LOCAL_COPY, 'utf8')); } catch {}
  return JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
}

let remote: SupabaseClient | undefined;
function client() {
  // The portal shares the simulator's Supabase project, so by default the enquiries are read with the
  // portal's own connection. ENQUIRIES_* still works if the two are ever split into separate projects.
  const url = process.env.ENQUIRIES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.ENQUIRIES_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL / service role key are not set.');
  remote ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return remote;
}

const isOpen = (e: Enquiry) => !['won', 'lost', 'spam'].includes(e.status);

export async function listEnquiries(status?: EnquiryStatus | 'open'): Promise<Enquiry[]> {
  if (useFixtures()) {
    return readFixtures()
      .filter(e => !status || (status === 'open' ? isOpen(e) : e.status === status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  let q = client().from('institution_enquiries').select(COLS).order('created_at', { ascending: false }).limit(500);
  if (status === 'open') q = q.not('status', 'in', '(won,lost,spam)');
  else if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`Couldn't read enquiries (${error.message})`);
  return (data ?? []) as Enquiry[];
}

export async function getEnquiry(ref: string): Promise<Enquiry | null> {
  if (!/^SG-[A-Z0-9]{6}$/.test(ref)) return null;
  if (useFixtures()) return readFixtures().find(e => e.ref === ref) ?? null;
  const { data, error } = await client().from('institution_enquiries').select(COLS).eq('ref', ref).maybeSingle();
  if (error) throw new Error(`Couldn't read the enquiry (${error.message})`);
  return data as Enquiry | null;
}

/* Sets the enquiry's status and appends one line to its notes. Only these two columns change. */
export async function updateEnquiry(ref: string, status: EnquiryStatus, noteLine: string) {
  if (!ENQUIRY_STATUSES.includes(status)) throw new Error('Not an enquiry status');
  const line = `[console] ${noteLine}`;
  if (useFixtures()) {
    const all = readFixtures();
    const e = all.find(x => x.ref === ref);
    if (!e) return;
    e.status = status; e.notes = e.notes ? `${e.notes}\n${line}` : line;
    fs.writeFileSync(LOCAL_COPY, JSON.stringify(all, null, 2));
    return;
  }
  const sb = client();
  const { data: row, error: e1 } = await sb.from('institution_enquiries').select('notes').eq('ref', ref).maybeSingle();
  if (e1 || !row) throw new Error(`Couldn't find enquiry ${ref}`);
  const notes = row.notes ? `${row.notes}\n${line}` : line;
  const { error } = await sb.from('institution_enquiries').update({ status, notes }).eq('ref', ref);
  if (error) throw new Error(`Couldn't update enquiry ${ref} (${error.message})`);
}
