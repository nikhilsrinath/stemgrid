// Creates (or updates) a StemGrid console staff account: an auth user plus an active staff_users row.
// The password is never stored in the repo: pass it in the STAFF_PASSWORD environment variable.
//
//   node --env-file=.env.vercel scripts/create-staff.mjs --email info@stemgrid.in --name "StemGrid Admin"
//
// Supabase credentials come from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// The auth user pool is shared with the simulator: if the email already has an account, its
// password is changed to STAFF_PASSWORD.
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string', default: 'StemGrid Admin' } } });
const email = (values.email ?? '').trim().toLowerCase();
const name = values.name.trim();
const password = process.env.STAFF_PASSWORD ?? '';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fail = msg => { console.error(`✗ ${msg}`); process.exit(1); };
if (!url || !key) fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. node --env-file=.env.vercel …).');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Pass --email you@example.com');
if (password.length < 8) fail('Set STAFF_PASSWORD (at least 8 characters).');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(addr) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`listing users: ${error.message}`);
    const hit = data.users.find(u => u.email?.toLowerCase() === addr);
    if (hit || data.users.length < 1000) return hit ?? null;
  }
}

let user = await findUser(email);
if (user) {
  const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) fail(`updating ${email}: ${error.message}`);
  console.log(`• Existing user ${email}: password updated.`);
} else {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, kind: 'staff' } });
  if (error) fail(`creating ${email}: ${error.message}`);
  user = data.user;
  console.log(`• Created user ${email}.`);
}

const { error } = await db.from('staff_users').upsert({ id: user.id, name, email, active: true }, { onConflict: 'id' });
if (error) fail(`staff_users: ${error.message}`);
console.log(`✓ ${email} is an active console staff member. Sign in at the console; the first sign-in enrols an authenticator app.`);
