// Demo data for local testing (brief §19.3). Deterministic logins; obviously fake names and
// .demo / .local emails only. Run by `pnpm portal:local` / `pnpm portal:reset` after `supabase db reset`.
// Refuses to run against anything but the local Supabase stack.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.development.local'), 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(URL_ ?? '')) { console.error('seed-demo only runs against the local Supabase stack.'); process.exit(1); }
const db = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const accounts = JSON.parse(fs.readFileSync(path.join(ROOT, 'dev', 'demo-accounts.json'), 'utf8'));
const acct = k => accounts.find(a => a.key === k);

const DAY = 86_400_000, IST = 330 * 60_000;
const NOW = new Date();
const iso = d => d.toISOString();
const days = n => new Date(NOW.getTime() + n * DAY);
const addMonths = (d, n) => { const x = new Date(d.getTime() + IST); x.setUTCMonth(x.getUTCMonth() + n); return new Date(x.getTime() - IST); };
const monthStart = (d, back = 0) => { const x = new Date(d.getTime() + IST); const m = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() - back, 1)); return m.toISOString().slice(0, 10); };
const fy = d => { const x = new Date(d.getTime() + IST); const y = x.getUTCMonth() >= 3 ? x.getUTCFullYear() : x.getUTCFullYear() - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };

const must = (r, what) => { if (r.error) { console.error(`✗ ${what}:`, r.error.message); process.exit(1); } return r.data; };
const rng = (() => { let s = 20261126; return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); })();   // deterministic
const pick = a => a[Math.floor(rng() * a.length)];
const pin = () => { for (;;) { const p = String(Math.floor(rng() * 1e6)).padStart(6, '0'); if (!/^(\d)\1{5}$/.test(p) && p !== '123456' && p !== '654321') return p; } };

async function user(email, password, meta = {}) {
  const r = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  return must(r, `user ${email}`).user.id;
}
async function inChunks(items, n, fn) { for (let i = 0; i < items.length; i += n) await Promise.all(items.slice(i, i + n).map(fn)); }

const FIRST = ['Aarav', 'Diya', 'Ishaan', 'Ananya', 'Vihaan', 'Saanvi', 'Arjun', 'Kavya', 'Rohan', 'Nila', 'Kabir', 'Tara', 'Dev', 'Mira', 'Aditya', 'Riya', 'Karthik', 'Sneha', 'Varun', 'Pooja', 'Nikhil', 'Lavanya', 'Siddharth', 'Harini', 'Pranav', 'Janani', 'Yash', 'Keerthi', 'Rahul', 'Divya'];
const LAST = ['Demo', 'Testkumar', 'Samplerao', 'Fakename', 'Placeholder', 'Exampleson', 'Mockiyer', 'Dummyraj'];
const BUILD = {
  v: 1, camera: { pos: [9, 12, 14], target: [0, 0, 0] },
  plates: [{ id: 1, name: 'Base plate 1', x: 0, z: 0 }],
  modules: [
    { id: 2, kind: 'quark', name: 'Quark C3 1', plate: 1, lx: -1.5, lz: 2.5, yaw: 0, code: 'while True:\n    print(ultrasonic.distance())\n    sleep(1)\n' },
    { id: 3, kind: 'ultrasonic', name: 'Ultrasonic 1', plate: 1, lx: -0.5, lz: -4.5, yaw: 0, state: { distance: 42 } },
    { id: 4, kind: 'buzzer', name: 'Buzzer 1', plate: 1, lx: 4.5, lz: -3.5, yaw: 0, state: { vol: 0.5, mode: 'manual', follow: false } },
  ],
  cables: [],
};

console.log('Seeding demo data…');
const waves = Object.fromEntries(must(await db.from('waves').select('*'), 'waves').map(w => [w.code, w]));
const prices = must(await db.from('wave_prices').select('*'), 'prices');
const price = (wave, plan) => prices.find(p => p.wave_id === waves[wave].id && p.plan_code === plan).price_paise;

// ---------------------------------------------------------------- staff
const staffId = await user(acct('staff').email, acct('staff').password, { name: 'Demo Staff', kind: 'staff' });
must(await db.from('staff_users').insert({ id: staffId, name: 'Demo Staff', email: acct('staff').email }), 'staff');

// ---------------------------------------------------------------- institutes
let member = 0;
async function institute(o) {
  const row = {
    type: 'Academy / coaching centre', city: 'Chennai', state: 'Tamil Nadu', address: '12 Demo Street', gst_number: '',
    contact_name: 'Demo Contact', contact_phone: '+91 90000 00000', approved_at: iso(days(-120)), approved_by: staffId,
    terms_version_accepted: env.TERMS_VERSION || '2026-11-v1', terms_accepted_at: iso(days(-100)), consent_declared_at: iso(days(-100)),
    ...o,
  };
  return must(await db.from('institutes').insert(row).select('*').single(), `institute ${o.slug}`);
}
// Bright Minds: Founding, free period, 45 days left
const brightEnds = days(45), brightLive = addMonths(brightEnds, -waves.founding.free_months);
const bright = await institute({ slug: 'bright-minds', name: 'Bright Minds Academy', contact_email: acct('bright-admin').email, contact_name: 'Bright Minds Admin',
  status: 'free_period', wave_id: waves.founding.id, member_number: ++member, enquiry_ref: 'SG-BRT001', paid_at: iso(new Date(brightLive.getTime() - 5 * DAY)), training_at: iso(brightLive), go_live_at: iso(brightLive),
  free_period_ends_at: iso(brightEnds), minimum_term_ends_at: iso(addMonths(brightEnds, 3)), lock_ends_at: iso(addMonths(brightEnds, 36)) });
// Spark STEM: Founding, grace (payment failed 3 days ago)
const sparkEnds = days(-40);
const spark = await institute({ slug: 'spark-stem', name: 'Spark STEM Centre', contact_email: acct('spark-admin').email, city: 'Bengaluru', state: 'Karnataka', contact_name: 'Spark Admin',
  status: 'grace', wave_id: waves.founding.id, member_number: ++member, paid_at: iso(addMonths(sparkEnds, -3)), go_live_at: iso(addMonths(sparkEnds, -3)),
  free_period_ends_at: iso(sparkEnds), minimum_term_ends_at: iso(addMonths(sparkEnds, 3)), lock_ends_at: iso(addMonths(sparkEnds, 36)), grace_started_at: iso(days(-3)), payment_due_at: iso(days(-3)) });
// Orbit Coding Club: Founding, active (third founding place)
const orbitEnds = days(-70);
const orbit = await institute({ slug: 'orbit-coding', name: 'Orbit Coding Club', contact_email: 'admin@orbit.demo', city: 'Madurai', status: 'active', wave_id: waves.founding.id, member_number: ++member,
  paid_at: iso(addMonths(orbitEnds, -3)), go_live_at: iso(addMonths(orbitEnds, -3)), free_period_ends_at: iso(orbitEnds), minimum_term_ends_at: iso(addMonths(orbitEnds, 3)), lock_ends_at: iso(addMonths(orbitEnds, 36)) });
// Nova Robotics: Charter, active on Growth, 88 of 90
const novaEnds = days(-60);
const nova = await institute({ slug: 'nova-robotics', name: 'Nova Robotics', contact_email: acct('nova-admin').email, city: 'Hyderabad', state: 'Telangana', contact_name: 'Nova Admin', gst_number: '36AAAAA0000A1Z5',
  status: 'active', wave_id: waves.charter.id, member_number: ++member, paid_at: iso(addMonths(novaEnds, -2)), go_live_at: iso(addMonths(novaEnds, -2)),
  free_period_ends_at: iso(novaEnds), minimum_term_ends_at: iso(addMonths(novaEnds, 3)), lock_ends_at: iso(addMonths(novaEnds, 36)) });
// Lotus Learning Hub: approved, waiting to activate
const lotus = await institute({ slug: 'lotus-learning', name: 'Lotus Learning Hub', contact_email: 'deepa@lotus.demo', contact_name: 'Deepa Krishnan', contact_phone: '+91 90000 44444', address: '',
  status: 'approved', wave_id: waves.charter.id, enquiry_ref: 'SG-2LTS8B', approved_at: iso(days(-1)), terms_version_accepted: null, terms_accepted_at: null, consent_declared_at: null });

// subscriptions
must(await db.from('subscriptions').insert([
  { institute_id: bright.id, status: 'pending', billing_day: 1 },
  { institute_id: spark.id, plan_code: 'starter', price_paise: price('founding', 'starter'), status: 'past_due', billing_day: 5, current_period_start: iso(sparkEnds), current_period_end: iso(days(-3)), plan_confirmed_at: iso(days(-45)), peak_active: 24 },
  { institute_id: orbit.id, plan_code: 'starter', price_paise: price('founding', 'starter'), status: 'active', billing_day: 10, current_period_start: iso(days(-10)), current_period_end: iso(days(20)), plan_confirmed_at: iso(days(-75)), peak_active: 18 },
  { institute_id: nova.id, plan_code: 'growth', price_paise: price('charter', 'growth'), status: 'active', billing_day: 15, current_period_start: iso(days(-15)), current_period_end: iso(days(15)), plan_confirmed_at: iso(days(-65)), peak_active: 86 },
]), 'subscriptions');

// ---------------------------------------------------------------- people
async function staffUser(inst, key, role, name) {
  const a = acct(key) ?? { email: key, password: 'demo-teacher-123' };
  const id = await user(a.email, a.password, { name });
  must(await db.from('portal_users').insert({ id, institute_id: inst.id, role, display_name: name, email: a.email }), `portal user ${a.email}`);
  return id;
}
async function students(inst, list) {
  const out = [];
  await inChunks(list, 10, async s => {
    const id = await user(`${s.username}@${inst.id}.students.invalid`, `sgpin-${s.pin}`, { kind: 'student' });
    must(await db.from('portal_users').insert({ id, institute_id: inst.id, role: 'student', display_name: s.name, username: s.username }), `student ${s.username}`);
    out.push({ ...s, id });
  });
  return list.map(s => out.find(o => o.username === s.username));
}
function fakeStudents(n, prefix, taken = new Set()) {
  const list = [];
  while (list.length < n) {
    const f = pick(FIRST), l = pick(LAST), base = `${f.toLowerCase()}-${l[0].toLowerCase()}`;
    let u = base, i = 2; while (taken.has(u)) u = `${base}${i++}`;
    taken.add(u); list.push({ name: `${f} ${l}`, username: u, pin: pin(), prefix });
  }
  return list;
}

const brightAdmin = await staffUser(bright, 'bright-admin', 'institute_admin', 'Anita Rao (demo)');
const priya = await staffUser(bright, 'bright-priya', 'teacher', 'Priya Sharma (demo)');
const arun = await staffUser(bright, 'bright-arun', 'teacher', 'Arun Kumar (demo)');
const novaAdmin = await staffUser(nova, 'nova-admin', 'institute_admin', 'Vikram Nair (demo)');
const novaT = await staffUser(nova, 'teacher1@nova.demo', 'teacher', 'Sana Iqbal (demo)');
const sparkAdmin = await staffUser(spark, 'spark-admin', 'institute_admin', 'Meghna Pillai (demo)');
await staffUser(orbit, 'admin@orbit.demo', 'institute_admin', 'Orbit Admin (demo)');

const bTaken = new Set(['ravi-k', 'meera-s']);
const brightStudents = await students(bright, [
  { name: 'Ravi Kumar', username: 'ravi-k', pin: acct('bright-ravi').pin },
  { name: 'Meera Srinivasan', username: 'meera-s', pin: acct('bright-meera').pin },
  ...fakeStudents(64, 'b', bTaken),
]);
const nTaken = new Set(['asha-n', 'kabir-n', 'zoya-n']);
const novaStudents = await students(nova, [
  ...fakeStudents(90, 'n', nTaken),
  // three not-yet-counted students for the "limit" test (TESTING.md script 5), all PIN 586204
  { name: 'Asha New', username: 'asha-n', pin: '586204' }, { name: 'Kabir New', username: 'kabir-n', pin: '586204' }, { name: 'Zoya New', username: 'zoya-n', pin: '586204' },
]);
const sparkStudents = await students(spark, fakeStudents(25, 's'));

// ---------------------------------------------------------------- batches
const code = (() => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return () => Array.from({ length: 6 }, () => A[Math.floor(rng() * A.length)]).join(''); })();
async function batch(inst, o, teachers = []) {
  const b = must(await db.from('batches').insert({ institute_id: inst.id, join_code: o.join_code ?? code(), ...o }).select('*').single(), `batch ${o.name}`);
  if (teachers.length) must(await db.from('batch_teachers').insert(teachers.map(t => ({ batch_id: b.id, teacher_id: t, institute_id: inst.id }))), 'batch teachers');
  return b;
}
async function enrol(inst, b, list) {
  if (list.length) must(await db.from('batch_students').insert(list.map(s => ({ batch_id: b.id, student_id: s.id, institute_id: inst.id, joined_at: iso(days(-30)) }))), 'enrol');
}
const robo = await batch(bright, { name: 'Robotics Saturday', course: 'Electronics Level 1', schedule_text: 'Sat 10:00–12:00', starts_on: monthStart(NOW, 2) }, [priya]);
const coding = await batch(bright, { name: 'Coding Club Weekdays', course: 'Python with Quark', schedule_text: 'Mon & Wed 17:00' }, [priya]);
const junior = await batch(bright, { name: 'Junior Makers', course: 'Intro to sensors', schedule_text: 'Fri 16:00', self_join: true, join_code: 'BRT7KQ' }, [arun]);
const camp = await batch(bright, { name: 'Summer Camp 2026', course: 'Holiday camp', schedule_text: 'May 2026', status: 'archived', starts_on: '2026-05-01', ends_on: '2026-05-31' });
await enrol(bright, robo, brightStudents.slice(0, 24));
await enrol(bright, coding, brightStudents.slice(20, 44));
await enrol(bright, junior, brightStudents.slice(44, 60));
await enrol(bright, camp, brightStudents.slice(30, 50));
const novaBatches = [];
for (const [i, n] of ['Robotics A', 'Robotics B', 'Drones Club', 'Coding Mon', 'Coding Thu', 'Sensors Lab', 'Weekend Makers', 'Advanced Projects'].entries()) {
  const b = await batch(nova, { name: n, course: i < 2 ? 'Robotics' : 'Electronics', schedule_text: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sat'][i] + ' 16:00' }, i < 4 ? [novaT] : []);
  novaBatches.push(b);
  await enrol(nova, b, novaStudents.slice(i * 12, i * 12 + 12));
}
const sparkBatch = await batch(spark, { name: 'Evening Electronics', course: 'Electronics', schedule_text: 'Tue & Thu 18:00' });
await enrol(spark, sparkBatch, sparkStudents);

// ---------------------------------------------------------------- usage: this month + 6 months of history
const month = monthStart(NOW);
async function active(inst, list, m = month) {
  if (list.length) must(await db.from('monthly_active_students').insert(list.map(s => ({ institute_id: inst.id, month: m, student_id: s.id, first_seen_at: iso(days(-1)) }))), 'usage');
}
await active(bright, brightStudents.slice(2, 64));        // 62 (Ravi and Meera not yet counted)
await active(nova, novaStudents.slice(0, 88));            // 88 of 90
await active(spark, sparkStudents.slice(0, 19));
const hist = [];
for (let back = 1; back <= 6; back++) {
  const m = monthStart(NOW, back);
  hist.push({ institute_id: bright.id, month: m, active_count: Math.max(0, 58 - back * 6), limit_at_time: 300, plan_code: null });
  hist.push({ institute_id: nova.id, month: m, active_count: 86 - back * 3, limit_at_time: back <= 2 ? 90 : 300, plan_code: back <= 2 ? 'growth' : null });
  hist.push({ institute_id: spark.id, month: m, active_count: 24 - back, limit_at_time: back <= 1 ? 30 : 300, plan_code: back <= 1 ? 'starter' : null });
}
must(await db.from('usage_months').insert(hist), 'usage months');
// counts behind the history (so the plan recommendation sees a real peak)
for (let back = 1; back <= 2; back++) await active(bright, brightStudents.slice(0, 58 - back * 6), monthStart(NOW, back));

// ---------------------------------------------------------------- payments + invoices (PDFs render on first download)
const gst = p => Math.round(p * 0.18);
async function paid(inst, kind, amount, at, provider = 'manual') {
  const p = must(await db.from('payments').insert({ institute_id: inst.id, kind, amount_paise: amount, gst_paise: gst(amount), provider, status: 'paid', paid_at: iso(at), provider_payment_id: `seed_${crypto.randomUUID()}`, note: 'demo' }).select('*').single(), 'payment');
  const seq = must(await db.rpc('next_invoice_number', { p_fy: fy(at) }), 'invoice number');
  const intra = (inst.state || '').toLowerCase() === (env.INVOICE_SELLER_STATE || 'Tamil Nadu').toLowerCase();
  const g = gst(amount), half = Math.floor(g / 2);
  must(await db.from('invoices').insert({ institute_id: inst.id, payment_id: p.id, number: `SG/${fy(at)}/${String(seq).padStart(4, '0')}`, amount_paise: amount, gst_paise: g,
    cgst_paise: intra ? half : 0, sgst_paise: intra ? g - half : 0, igst_paise: intra ? 0 : g,
    buyer: { name: inst.name, address: [inst.address, inst.city, inst.state].filter(Boolean).join(', '), gstin: inst.gst_number, state: inst.state, email: inst.contact_email },
    description: kind === 'joining' ? 'StemGrid membership: first month + onboarding (bundled)' : 'StemGrid simulator subscription: monthly plan', issued_at: iso(at) }), 'invoice');
}
await paid(bright, 'joining', waves.founding.join_price_paise, new Date(bright.paid_at));
await paid(spark, 'joining', waves.founding.join_price_paise, new Date(spark.paid_at));
await paid(orbit, 'joining', waves.founding.join_price_paise, new Date(orbit.paid_at));
await paid(nova, 'joining', waves.charter.join_price_paise, new Date(nova.paid_at));
await paid(nova, 'monthly', price('charter', 'growth'), days(-45));
await paid(nova, 'monthly', price('charter', 'growth'), days(-15));
must(await db.from('payments').insert({ institute_id: spark.id, kind: 'monthly', amount_paise: price('founding', 'starter'), gst_paise: gst(price('founding', 'starter')), provider: 'razorpay', status: 'failed', note: 'Card declined (demo)', provider_order_id: 'plink_demo_failed' }), 'failed payment');

// ---------------------------------------------------------------- saved simulator projects
const projects = [
  { owner: brightStudents[0], name: 'Distance alarm' }, { owner: brightStudents[0], name: 'Parking sensor' },
  { owner: brightStudents[1], name: 'My first build' }, { owner: brightStudents[5], name: 'Buzzer tune' },
];
must(await db.from('student_projects').insert(projects.map(p => ({ institute_id: bright.id, owner_id: p.owner.id, name: p.name, data: BUILD, module_count: BUILD.modules.length }))), 'projects');

// ---------------------------------------------------------------- activity log
must(await db.from('activity_log').insert([
  { institute_id: bright.id, actor_kind: 'staff', actor_id: staffId, actor_name: 'Demo Staff', action: 'institute.approved', after: { status: 'approved' }, at: iso(days(-120)) },
  { institute_id: bright.id, actor_kind: 'system', actor_name: 'Razorpay webhook', action: 'institute.paid', after: { status: 'paid', member_number: 1 }, at: bright.paid_at },
  { institute_id: bright.id, actor_kind: 'staff', actor_id: staffId, actor_name: 'Demo Staff', action: 'institute.onboarding_complete', after: { status: 'free_period' }, at: bright.go_live_at },
  { institute_id: bright.id, actor_kind: 'portal', actor_id: brightAdmin, actor_name: 'Anita Rao (demo) (institute_admin)', action: 'batch.created', target_type: 'batch', target_id: robo.id, at: iso(days(-30)) },
  { institute_id: spark.id, actor_kind: 'system', actor_name: 'Razorpay webhook', action: 'institute.grace', after: { status: 'grace', note: 'Card declined (demo)' }, at: iso(days(-3)) },
  { institute_id: lotus.id, actor_kind: 'staff', actor_id: staffId, actor_name: 'Demo Staff', action: 'institute.approved', after: { status: 'approved', slug: 'lotus-learning' }, at: iso(days(-1)) },
]), 'activity');
void novaAdmin; void sparkAdmin;

// ---------------------------------------------------------------- the approved institute's activation link, in the local mailbox
const token = crypto.randomBytes(32).toString('base64url');
must(await db.from('activation_tokens').insert({ token_hash: crypto.createHash('sha256').update(token).digest('hex'), institute_id: lotus.id, email: lotus.contact_email, expires_at: iso(days(7)) }), 'activation token');
const learn = env.NEXT_PUBLIC_PORTAL_URL || 'http://learn.localhost:3002';
const link = `${learn}/activate/${token}`;
const mail = [{ id: crypto.randomUUID(), at: iso(NOW), to: lotus.contact_email, subject: 'Welcome to StemGrid: activate Lotus Learning Hub',
  text: `Hello Deepa Krishnan,\n\nGood news: Lotus Learning Hub has been approved for a StemGrid membership (Charter Members).\n\nOpen this link to activate your institute portal:\n\n${link}\n\nThe link works once and expires in 7 days.\n\nStemGrid` }];
fs.writeFileSync(path.join(ROOT, 'dev', '.mailbox.json'), JSON.stringify(mail, null, 2));
fs.rmSync(path.join(ROOT, 'dev', '.enquiries.local.json'), { force: true });
fs.writeFileSync(path.join(ROOT, 'dev', '.state.json'), JSON.stringify({ offsetMs: 0 }, null, 2));
fs.writeFileSync(path.join(ROOT, 'dev', '.activation-link'), link);

console.log(`✓ Demo data ready: 5 institutes, ${brightStudents.length + novaStudents.length + sparkStudents.length} students.`);
