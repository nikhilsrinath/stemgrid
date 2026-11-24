'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/origin';
import { safeNext } from '@/lib/safe-next';

export type FormState = { error?: string; done?: boolean; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/* Supabase's messages, in plain words. */
function friendly(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return "That email and password don't match. Check them and try again.";
  if (m.includes('email not confirmed')) return 'Confirm your email first. Open the link we sent you when you signed up.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'There is already an account with that email. Try signing in.';
  if (m.includes('password') && (m.includes('least') || m.includes('short') || m.includes('weak'))) return 'Pick a longer password: at least 8 characters.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many tries in a short time. Wait a minute, then try again.';
  if (m.includes('same as the old') || m.includes('different from the old')) return 'Your new password has to be different from your old one.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return "Google sign-in isn't switched on yet. Use your email for now.";
  return 'Something went wrong. Try again in a moment.';
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  if (!EMAIL.test(email)) return { error: 'Enter your email address.' };
  if (!password) return { error: 'Enter your password.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };
  redirect(safeNext(str(form, 'next')));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form, 'name').slice(0, 50), email = str(form, 'email').toLowerCase(), password = String(form.get('password') ?? '');
  if (!name) return { error: 'Tell us your name.' };
  if (!EMAIL.test(email)) return { error: 'That email address doesn\'t look right.' };
  if (password.length < 8) return { error: 'Pick a longer password: at least 8 characters.' };
  const next = safeNext(str(form, 'next'), '/projects');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: friendly(error.message) };
  if (data.session) redirect(next);           // email confirmation switched off: straight in
  return { done: true, email };
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNext(str(form, 'next'));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(friendly(error?.message ?? ''))}`);
  redirect(data.url);
}

export async function forgotPassword(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter the email you signed up with.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error && /rate|too many|security/i.test(error.message)) return { error: friendly(error.message) };
  return { done: true, email };                // same answer whether or not the account exists
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get('password') ?? ''), again = String(form.get('again') ?? '');
  if (password.length < 8) return { error: 'Pick a longer password: at least 8 characters.' };
  if (password !== again) return { error: "The two passwords don't match." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendly(error.message) };
  redirect('/projects?msg=password');
}

/* ---------------------------------------------------------------- institution enquiries */
export type EnquiryState = { error?: string; done?: boolean; ref?: string; name?: string; email?: string } | undefined;

const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const list = (f: FormData, k: string, max = 12) =>
  [...new Set(f.getAll(k).map(v => String(v).trim()).filter(Boolean))].slice(0, max).map(v => v.slice(0, 80));
const opt = (f: FormData, k: string, max: number) => str(f, k).slice(0, max) || null;

function newRef() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // no 0/O or 1/I: read out on the phone
  const b = crypto.getRandomValues(new Uint8Array(6));
  return 'SG-' + [...b].map(x => A[x % A.length]).join('');
}

export async function submitEnquiry(_: EnquiryState, form: FormData): Promise<EnquiryState> {
  if (str(form, 'company_fax')) return { done: true, ref: newRef() };   // honeypot: bots fill every box

  let website = str(form, 'website').slice(0, 200);
  if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;
  const row = {
    ref: newRef(),
    org_name: str(form, 'org_name').slice(0, 120),
    org_type: str(form, 'org_type').slice(0, 60),
    curriculum: opt(form, 'curriculum', 60),
    website: website || null,
    city: str(form, 'city').slice(0, 80),
    region: str(form, 'region').slice(0, 80),
    country: str(form, 'country').slice(0, 60) || 'India',
    learners: str(form, 'learners').slice(0, 40),
    levels: list(form, 'levels'),
    contact_name: str(form, 'contact_name').slice(0, 80),
    designation: str(form, 'designation').slice(0, 80),
    email: str(form, 'email').toLowerCase().slice(0, 160),
    phone: str(form, 'phone').slice(0, 20),
    channel: opt(form, 'channel', 30),
    best_time: opt(form, 'best_time', 30),
    interests: list(form, 'interests'),
    current_setup: opt(form, 'current_setup', 80),
    timeline: str(form, 'timeline').slice(0, 60),
    decision_role: opt(form, 'decision_role', 60),
    budget: opt(form, 'budget', 60),
    heard_from: opt(form, 'heard_from', 60),
    message: str(form, 'message').slice(0, 2000),
    consent: form.get('consent') === 'on',
  };

  if (row.org_name.length < 2) return { error: 'Tell us the name of your institution.' };
  if (!row.org_type) return { error: 'Pick the kind of institution you are.' };
  if (!row.city || !row.region) return { error: 'Add your city and state.' };
  if (!row.learners) return { error: 'Roughly how many learners do you have?' };
  if (row.contact_name.length < 2) return { error: 'Tell us who we should talk to.' };
  if (!row.designation) return { error: 'Add your role at the institution.' };
  if (!EMAIL.test(row.email)) return { error: "That email address doesn't look right." };
  if (!PHONE.test(row.phone)) return { error: 'Add a phone number we can reach you on, with the country code.' };
  if (!row.interests.length) return { error: 'Pick at least one thing you are interested in.' };
  if (!row.timeline) return { error: 'Tell us when you are hoping to start.' };
  if (!row.consent) return { error: 'Tick the box so we are allowed to contact you.' };

  const supabase = await supabaseServer();
  let { error } = await supabase.from('institution_enquiries').insert(row);
  if (error?.code === '23505') {                           // ref collision: one retry is plenty
    row.ref = newRef();
    ({ error } = await supabase.from('institution_enquiries').insert(row));
  }
  if (error) {
    console.error('enquiry insert failed', error);
    return { error: "We couldn't send that just now. Try again in a moment, or call us on +91 89251 72636." };
  }
  await notifyTeam(row).catch(e => console.error('enquiry email failed', e));
  return { done: true, ref: row.ref, name: row.contact_name.split(/\s+/)[0], email: row.email };
}

/* Optional: email the team about each new enquiry through Resend (set RESEND_API_KEY,
   ENQUIRY_NOTIFY_TO and ENQUIRY_NOTIFY_FROM). Without them the enquiry is only stored. */
async function notifyTeam(r: Record<string, unknown>) {
  const key = process.env.RESEND_API_KEY, to = process.env.ENQUIRY_NOTIFY_TO, from = process.env.ENQUIRY_NOTIFY_FROM;
  if (!key || !to || !from) return;
  const esc = (v: unknown) => String(Array.isArray(v) ? v.join(', ') : v ?? '—').replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const rows: [string, unknown][] = [
    ['Reference', r.ref], ['Institution', r.org_name], ['Type', r.org_type], ['Curriculum', r.curriculum],
    ['Location', `${r.city}, ${r.region}, ${r.country}`], ['Website', r.website], ['Learners', r.learners], ['Levels', r.levels],
    ['Contact', r.contact_name], ['Role', r.designation], ['Email', r.email], ['Phone', r.phone],
    ['Prefers', r.channel], ['Best time', r.best_time], ['Interested in', r.interests], ['Current setup', r.current_setup],
    ['Timeline', r.timeline], ['Decision', r.decision_role], ['Budget', r.budget], ['Heard via', r.heard_from], ['Message', r.message],
  ];
  const html = `<h2>New institution enquiry ${esc(r.ref)}</h2><table cellpadding="6" style="border-collapse:collapse;font:14px sans-serif">${
    rows.map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map(s => s.trim()), reply_to: r.email, subject: `New enquiry: ${r.org_name} (${r.ref})`, html }),
  });
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
