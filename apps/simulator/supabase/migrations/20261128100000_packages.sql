-- Packages: every price and package term is editable in the console (/packages), and institutes can
-- join on a Standard plan (no membership) once the 20 membership places are gone or not offered.
--
--   * waves.terms                 the bullet terms shown for each membership wave (activation + console)
--   * addons                      priced extras (extra students, teachers, onboarding, certificates, kits)
--   * pricing_settings            one row: annual billing, minimum term, price lock, billing rules, standard terms
--   * institutes.wave_id = null   a Standard institute: pays onboarding + its plan's first month, no free
--                                 period, no member number, no price lock. Its plan is chosen at approval
--                                 (subscriptions.plan_code before payment).
-- Money is integer paise before 18% GST, as everywhere else.

-- ---------------------------------------------------------------- wave terms
alter table public.waves add column if not exists terms text[] not null default '{}';

update public.waves set terms = array[
  'First 10 institutes. Places go in the order full payments arrive.',
  'One joining payment covers the first paid month, 2 free months and onboarding with teacher training.',
  'Unlimited student logins for 3 months from go-live (fair use 300 active students a month).',
  'Then the plan that fits your busiest month, at your locked member price.',
  'Member prices for the plan and extra students are locked for 36 months while the subscription is continuous.',
  'Minimum term of 3 paid months after the unlimited period.',
  'Seat on the Partner Council (quarterly roadmap vote).',
  'The joining payment is non-refundable once the account is live.'
] where code = 'founding' and terms = '{}';

update public.waves set terms = array[
  'Next 10 institutes, after the Founding Partners. Places go in the order full payments arrive.',
  'One joining payment covers the first paid month, 1 free month and onboarding with teacher training.',
  'Unlimited student logins for 2 months from go-live (fair use 300 active students a month).',
  'Then the plan that fits your busiest month, at your locked member price.',
  'Member prices for the plan and extra students are locked for 36 months while the subscription is continuous.',
  'Minimum term of 3 paid months after the unlimited period.',
  'The joining payment is non-refundable once the account is live.'
] where code = 'charter' and terms = '{}';

-- ---------------------------------------------------------------- add-ons
create table if not exists public.addons (
  code            text primary key check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  name            text not null check (char_length(name) between 2 and 80),
  price_paise     int check (price_paise >= 0),                 -- null = priced on request (e.g. kits)
  price_max_paise int check (price_max_paise >= 0),             -- set for a range (₹150–200 each)
  unit            text not null default '' check (char_length(unit) <= 60),   -- 'per 10 students / month'
  note            text not null default '' check (char_length(note) <= 300),
  price_label     text not null default '' check (char_length(price_label) <= 40), -- shown when price is null
  system          boolean not null default false,               -- used by code; can't be deleted
  sort            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (price_max_paise is null or (price_paise is not null and price_max_paise >= price_paise))
);
create trigger addons_touch before update on public.addons for each row execute function public.touch_updated_at();

insert into public.addons (code, name, price_paise, price_max_paise, unit, note, price_label, system, sort) values
  ('extra_students',  'Extra students',              200000, null, 'per 10 / month', '₹200 per student, deliberately above plan rates', '', true, 1),
  ('extra_teacher',   'Extra teacher account',        50000, null, 'per month',      'One session at a time, like student accounts', '', true, 2),
  ('onboarding',      'Onboarding + teacher training', 500000, null, 'one-time',     'Waived for Founding Academies. Charged with the first month on Standard plans.', '', true, 3),
  ('certificate',     'StemGrid student certificate', 15000, 20000, 'each',          'Academies resell to parents. Only for student accounts that complete projects.', '', false, 4),
  ('kits',            'Physical kits',                null, null, '',                'Supplied through Qbitio', 'Buy or rent', false, 5)
on conflict (code) do nothing;

-- ---------------------------------------------------------------- settings (one row)
create table if not exists public.pricing_settings (
  id                   boolean primary key default true check (id),
  annual_paid_months   int not null default 10 check (annual_paid_months between 1 and 12),  -- pay N, get 12
  minimum_paid_months  int not null default 3 check (minimum_paid_months between 0 and 24),
  price_lock_months    int not null default 36 check (price_lock_months between 0 and 120),
  upgrade_note         text not null default '' check (char_length(upgrade_note) <= 600),
  billing_rules        text[] not null default '{}',
  standard_terms       text[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger pricing_settings_touch before update on public.pricing_settings for each row execute function public.touch_updated_at();

insert into public.pricing_settings (id, upgrade_note, billing_rules, standard_terms) values (true,
  'Add-ons cost more on purpose. Starter with 3 extra packs is ₹11,000 for 60 students; Growth is ₹12,000 for 90. The dashboard shows "Upgrade to Growth and save" once add-ons get close to the next plan.',
  array[
    'Monthly plans: 3-month minimum.',
    'Added packs are billed for the full current month.',
    'Downgrades and pack removals take effect at renewal.',
    'No mid-cycle refunds.',
    'All prices exclude 18% GST. State this on every quote.'
  ],
  array[
    'For institutes joining after the membership places are filled, or without a membership.',
    'Pay onboarding and teacher training plus the first month of your plan to join.',
    'Your plan starts on the day your account goes live. No free period, no member number.',
    'Regular prices apply. They are not locked and may change with 30 days'' notice.',
    'Minimum term of 3 paid months. After that, cancel with 30 days'' notice before the next billing date.',
    'Annual option: pay 10 months and get 12, in advance.',
    'Failed payment: 7-day grace period, then student access pauses. After 30 days the subscription lapses.'
  ])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- access: server only, like the other pricing tables
alter table public.addons enable row level security;
alter table public.pricing_settings enable row level security;
revoke all on public.addons, public.pricing_settings from anon, authenticated;

-- ---------------------------------------------------------------- Standard institutes (no wave)

-- Paid/onboarding → active: a Standard institute goes live straight onto its plan.
create or replace function public.institutes_status_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  ok boolean;
  f text := old.status::text; t text := new.status::text;
begin
  if f = t then return new; end if;
  if current_setting('sg.force_status', true) = 'on' then return new; end if;  -- local dev toolbar only
  ok := case
    when t = 'rejected' then f in ('approved', 'awaiting_payment')
    when f = 'approved' then t in ('awaiting_payment', 'paid')
    when f = 'awaiting_payment' then t in ('paid', 'approved')
    when f = 'paid' then t in ('onboarding', 'free_period') or (t = 'active' and new.wave_id is null)
    when f = 'onboarding' then t in ('free_period') or (t = 'active' and new.wave_id is null)
    when f = 'free_period' then t in ('active', 'grace')
    when f = 'active' then t in ('grace', 'cancelled', 'suspended')
    when f = 'grace' then t in ('active', 'suspended')
    when f = 'suspended' then t in ('active', 'lapsed')
    else false
  end;
  if not ok then
    raise exception 'Institute status cannot change from % to %', f, t using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- A Standard institute (no wave) takes no place and gets no member number: payment just marks it paid.
create or replace function public.assign_wave_place(p_institute uuid, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inst public.institutes; w public.waves; taken int; num int;
begin
  select * into inst from public.institutes where id = p_institute for update;
  if not found then raise exception 'No such institute'; end if;
  if inst.member_number is not null then
    return jsonb_build_object('result', 'already', 'member_number', inst.member_number);
  end if;
  if inst.wave_id is null then
    if inst.paid_at is not null then return jsonb_build_object('result', 'already'); end if;
    update public.institutes set status = 'paid', paid_at = p_now where id = p_institute;
    return jsonb_build_object('result', 'paid', 'wave', 'standard');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('stemgrid-wave-places', 0));
  select * into w from public.waves where id = inst.wave_id for update;
  if not found then raise exception 'Institute has no wave offered'; end if;
  select count(*) into taken from public.institutes where wave_id = w.id and member_number is not null;
  if taken >= w.places then
    update public.institutes set wave_full = true,
      status = case when status = 'approved' then 'awaiting_payment'::public.institute_status else status end
      where id = p_institute;
    return jsonb_build_object('result', 'wave_full', 'wave', w.code);
  end if;
  select coalesce(max(member_number), 0) + 1 into num from public.institutes;
  update public.institutes set member_number = num, wave_full = false, status = 'paid', paid_at = p_now
    where id = p_institute;
  return jsonb_build_object('result', 'paid', 'member_number', num, 'wave', w.code);
end $$;

revoke execute on function public.assign_wave_place(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.assign_wave_place(uuid, timestamptz) to service_role;
