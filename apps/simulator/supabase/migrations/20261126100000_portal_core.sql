-- StemGrid Institute Portal: core schema. Lives in the shared "stemgrid" project next to the simulator's tables.
-- (owner decision, 25 Nov 2026). It only adds portal tables, functions, buckets and storage policies.
--
-- Security model:
--   * Every table has RLS on.
--   * Portal users (admins, teachers, students) READ through the API, limited by the policies below.
--   * Portal users never WRITE through the API, except their own simulator projects
--     (student_projects) and thumbnails. Every other write goes through server code that
--     checks the caller's role and institute first and then uses the service-role key.
--   * Staff tables, tokens, pricing, the activity log and login attempts have no API access.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- pricing (seeded in the next migration)
create table public.waves (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code in ('founding', 'charter')),
  name                text not null,
  places              int not null check (places >= 0),
  join_price_paise    int not null check (join_price_paise >= 0),   -- bundled, before GST
  first_month_paise   int not null,
  onboarding_paise    int not null,
  bundle_saving_paise int not null,
  free_months         int not null check (free_months between 0 and 12), -- total unlimited period, incl. the paid month
  sort                int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.plans (
  code                text primary key check (code in ('starter', 'growth', 'pro')),
  name                text not null,
  student_limit       int not null,
  teacher_limit       int not null,
  regular_price_paise int not null,
  sort                int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.wave_prices (
  wave_id             uuid not null references public.waves (id) on delete cascade,
  plan_code           text not null references public.plans (code),
  price_paise         int not null,
  extra_pack_paise    int not null,
  extra_teacher_paise int not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (wave_id, plan_code)
);

create table public.reserved_slugs (
  slug       extensions.citext primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- institutes
create type public.institute_status as enum (
  'approved', 'awaiting_payment', 'paid', 'onboarding', 'free_period',
  'active', 'grace', 'suspended', 'lapsed', 'cancelled', 'rejected'
);

create table public.institutes (
  id                      uuid primary key default gen_random_uuid(),
  slug                    extensions.citext not null unique
                          check (slug ~ '^[a-z][a-z0-9-]{2,39}$'),
  name                    text not null check (char_length(name) between 2 and 120),
  type                    text not null default '' check (char_length(type) <= 60),
  city                    text not null default '' check (char_length(city) <= 80),
  state                   text not null default '' check (char_length(state) <= 80),
  address                 text not null default '' check (char_length(address) <= 400),
  gst_number              text not null default '' check (char_length(gst_number) <= 20),
  contact_name            text not null default '' check (char_length(contact_name) <= 80),
  contact_email           text not null check (char_length(contact_email) <= 160),
  contact_phone           text not null default '' check (char_length(contact_phone) <= 20),
  logo_path               text,
  status                  public.institute_status not null default 'approved',
  wave_id                 uuid references public.waves (id),
  wave_full               boolean not null default false,  -- paid while the offered wave was full: staff offer next wave or refund
  member_number           int unique,
  enquiry_ref             text,                             -- SG-XXXXXX in the simulator project
  approved_at             timestamptz,
  approved_by             uuid,
  paid_at                 timestamptz,
  training_at             timestamptz,
  go_live_at              timestamptz,
  free_period_ends_at     timestamptz,
  free_period_paused_days int not null default 0 check (free_period_paused_days between 0 and 30),
  pause_used              boolean not null default false,
  minimum_term_ends_at    timestamptz,
  lock_ends_at            timestamptz,
  lock_lost               boolean not null default false,  -- the price lock ended for good (lapse)
  grace_started_at        timestamptz,
  payment_due_at          timestamptz,
  suspended_at            timestamptz,
  lapsed_at               timestamptz,
  cancelled_at            timestamptz,
  rejected_reason         text,
  data_deleted_at         timestamptz,
  reminders_sent          text[] not null default '{}',     -- e.g. 'free_end_14', 'free_end_7', 'recommend'
  terms_version_accepted  text,
  terms_accepted_at       timestamptz,
  consent_declared_at     timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index institutes_status on public.institutes (status);
create index institutes_name on public.institutes (lower(name));
create trigger institutes_touch before update on public.institutes for each row execute function public.touch_updated_at();

-- Status changes happen only through named server functions (src/lib/lifecycle.ts). This guard
-- refuses any transition that isn't in the allowed list, whoever tries it.
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
    when f = 'paid' then t in ('onboarding', 'free_period')
    when f = 'onboarding' then t in ('free_period')
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
create trigger institutes_status_guard before update of status on public.institutes
  for each row execute function public.institutes_status_guard();

create table public.slug_history (
  slug         extensions.citext primary key,
  institute_id uuid not null references public.institutes (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- people
create table public.staff_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  email      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger staff_touch before update on public.staff_users for each row execute function public.touch_updated_at();

create table public.portal_users (
  id                 uuid primary key references auth.users (id) on delete cascade,
  institute_id       uuid not null references public.institutes (id) on delete cascade,
  role               text not null check (role in ('institute_admin', 'teacher', 'student')),
  display_name       text not null check (char_length(display_name) between 1 and 80),
  username           extensions.citext check (username ~ '^[a-z][a-z0-9-]{1,29}$'),
  email              text,                                  -- admins and teachers only; never for students
  status             text not null default 'active' check (status in ('active', 'archived')),
  current_session_id uuid,
  last_login_at      timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (institute_id, username),
  check (role <> 'student' or (username is not null and email is null))
);
create index portal_users_institute on public.portal_users (institute_id, role, status);
create trigger portal_users_touch before update on public.portal_users for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- batches (unlimited: no count limit anywhere)
create table public.batches (
  id                   uuid primary key default gen_random_uuid(),
  institute_id         uuid not null references public.institutes (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  course               text not null default '' check (char_length(course) <= 80),
  schedule_text        text not null default '' check (char_length(schedule_text) <= 120),
  starts_on            date,
  ends_on              date,
  join_code            text not null unique check (join_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  join_code_expires_at timestamptz,
  self_join            boolean not null default false,
  status               text not null default 'active' check (status in ('active', 'archived')),
  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index batches_institute on public.batches (institute_id, status);
create trigger batches_touch before update on public.batches for each row execute function public.touch_updated_at();

create table public.batch_teachers (
  batch_id     uuid not null references public.batches (id) on delete cascade,
  teacher_id   uuid not null references public.portal_users (id) on delete cascade,
  institute_id uuid not null references public.institutes (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (batch_id, teacher_id)
);
create index batch_teachers_teacher on public.batch_teachers (teacher_id);

create table public.batch_students (
  batch_id     uuid not null references public.batches (id) on delete cascade,
  student_id   uuid not null references public.portal_users (id) on delete cascade,
  institute_id uuid not null references public.institutes (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  joined_via   text not null default 'added' check (joined_via in ('added', 'csv', 'self', 'code')),
  removed_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (batch_id, student_id)
);
create index batch_students_student on public.batch_students (student_id);
create trigger batch_students_touch before update on public.batch_students for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- usage (this IS the billing count)
create table public.monthly_active_students (
  institute_id  uuid not null references public.institutes (id) on delete cascade,
  month         date not null check (extract(day from month) = 1),  -- first of the month, IST
  student_id    uuid not null,       -- no FK: deleting or archiving a student never lowers the count
  first_seen_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (institute_id, month, student_id)
);

create table public.usage_months (
  institute_id  uuid not null references public.institutes (id) on delete cascade,
  month         date not null,
  active_count  int not null,
  limit_at_time int not null,
  plan_code     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (institute_id, month)
);

create table public.usage_alerts (
  institute_id uuid not null references public.institutes (id) on delete cascade,
  month        date not null,
  threshold    int not null check (threshold in (80, 100)),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (institute_id, month, threshold)
);

-- ---------------------------------------------------------------- billing
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  institute_id             uuid not null unique references public.institutes (id) on delete cascade,
  plan_code                text references public.plans (code),
  price_paise              int,                -- locked member price for the plan
  extra_packs              int not null default 0 check (extra_packs >= 0),
  extra_teachers           int not null default 0 check (extra_teachers >= 0),
  billing_day              int check (billing_day between 1 and 31),
  status                   text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled')),
  provider_subscription_id text,
  mandate_status           text not null default 'none' check (mandate_status in ('none', 'pending', 'active', 'failed')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  recommended_plan_code    text references public.plans (code),
  recommended_extra_packs  int not null default 0,
  recommendation_due_at    timestamptz,
  plan_confirmed_at        timestamptz,
  peak_active              int not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  institute_id        uuid not null references public.institutes (id) on delete cascade,
  kind                text not null check (kind in ('joining', 'monthly', 'addon')),
  amount_paise        int not null check (amount_paise >= 0),   -- taxable value
  gst_paise           int not null default 0,
  provider            text not null check (provider in ('razorpay', 'mock', 'manual')),
  provider_order_id   text unique,         -- payment link / order id (created before the payment)
  provider_payment_id text unique,         -- the provider's payment id: makes the webhook idempotent
  status              text not null default 'created' check (status in ('created', 'paid', 'failed', 'cancelled', 'refunded')),
  paid_at             timestamptz,
  note                text not null default '',
  recorded_by         uuid,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index payments_institute on public.payments (institute_id, created_at desc);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

create table public.invoice_counters (
  fy         text primary key,
  last       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes (id) on delete cascade,
  payment_id   uuid not null unique references public.payments (id),
  number       text not null unique,       -- SG/2026-27/0001
  amount_paise int not null,               -- taxable value
  gst_paise    int not null,
  cgst_paise   int not null default 0,
  sgst_paise   int not null default 0,
  igst_paise   int not null default 0,
  buyer        jsonb not null default '{}',
  description  text not null default '',
  issued_at    timestamptz not null default now(),
  pdf_path     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index invoices_institute on public.invoices (institute_id, issued_at desc);

-- ---------------------------------------------------------------- tokens
create table public.activation_tokens (
  token_hash        text primary key,
  institute_id      uuid not null references public.institutes (id) on delete cascade,
  email             text not null,
  expires_at        timestamptz not null,
  used_at           timestamptz,
  otp_hash          text,
  otp_expires_at    timestamptz,
  otp_attempts      int not null default 0,
  email_verified_at timestamptz,
  user_id           uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger activation_tokens_touch before update on public.activation_tokens for each row execute function public.touch_updated_at();

create table public.invites (
  token_hash   text primary key,
  institute_id uuid not null references public.institutes (id) on delete cascade,
  role         text not null check (role in ('institute_admin', 'teacher')),
  email        text not null,
  display_name text not null default '',
  batch_id     uuid references public.batches (id) on delete set null,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  invited_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index invites_institute on public.invites (institute_id, created_at desc);

create table public.login_attempts (
  id           bigint generated always as identity primary key,
  institute_id uuid not null references public.institutes (id) on delete cascade,
  username     extensions.citext not null,
  attempted_at timestamptz not null default now(),
  success      boolean not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index login_attempts_lookup on public.login_attempts (institute_id, username, attempted_at desc);

-- ---------------------------------------------------------------- simulator saves inside the portal
create table public.student_projects (
  id             uuid primary key default gen_random_uuid(),
  institute_id   uuid not null references public.institutes (id) on delete cascade,
  owner_id       uuid not null references public.portal_users (id) on delete cascade,
  batch_id       uuid references public.batches (id) on delete set null,
  name           text not null default 'Untitled build' check (char_length(name) between 1 and 80),
  data           jsonb not null default '{}' check (pg_column_size(data) < 1048576),
  thumbnail_path text,
  module_count   int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index student_projects_owner on public.student_projects (owner_id, updated_at desc);
create trigger student_projects_touch before update on public.student_projects for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- activity log (append-only)
create table public.activity_log (
  id           bigint generated always as identity primary key,
  institute_id uuid references public.institutes (id) on delete set null,
  actor_id     uuid,
  actor_kind   text not null check (actor_kind in ('staff', 'portal', 'system')),
  actor_name   text not null default '',
  action       text not null,
  target_type  text,
  target_id    text,
  before       jsonb,
  after        jsonb,
  at           timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index activity_log_institute on public.activity_log (institute_id, at desc);
create or replace function public.activity_log_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'activity_log is append-only'; end $$;
create trigger activity_log_no_update before update or delete on public.activity_log
  for each row execute function public.activity_log_append_only();

-- ---------------------------------------------------------------- RLS helpers
create or replace function public.portal_institute_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select institute_id from public.portal_users where id = auth.uid() and status = 'active'
$$;

create or replace function public.portal_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.portal_users where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_teacher_of(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batch_teachers bt
    join public.portal_users pu on pu.id = bt.teacher_id and pu.status = 'active'
    where bt.batch_id = b and bt.teacher_id = auth.uid()
  )
$$;

-- true if the caller teaches a batch this student is currently in
create or replace function public.teaches_student(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.batch_students bs
    join public.batch_teachers bt on bt.batch_id = bs.batch_id
    where bs.student_id = s and bs.removed_at is null and bt.teacher_id = auth.uid()
  ) and public.portal_role() = 'teacher'
$$;

create or replace function public.in_batch(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.batch_students where batch_id = b and student_id = auth.uid() and removed_at is null)
$$;

revoke execute on function public.portal_institute_id(), public.portal_role(), public.is_teacher_of(uuid),
  public.teaches_student(uuid), public.in_batch(uuid) from public, anon;
grant execute on function public.portal_institute_id(), public.portal_role(), public.is_teacher_of(uuid),
  public.teaches_student(uuid), public.in_batch(uuid) to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.waves enable row level security;
alter table public.plans enable row level security;
alter table public.wave_prices enable row level security;
alter table public.reserved_slugs enable row level security;
alter table public.institutes enable row level security;
alter table public.slug_history enable row level security;
alter table public.staff_users enable row level security;
alter table public.portal_users enable row level security;
alter table public.batches enable row level security;
alter table public.batch_teachers enable row level security;
alter table public.batch_students enable row level security;
alter table public.monthly_active_students enable row level security;
alter table public.usage_months enable row level security;
alter table public.usage_alerts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.activation_tokens enable row level security;
alter table public.invites enable row level security;
alter table public.login_attempts enable row level security;
alter table public.student_projects enable row level security;
alter table public.activity_log enable row level security;

-- No policies (= no API access for portal users): waves, plans, wave_prices, reserved_slugs,
-- slug_history, staff_users, invoice_counters, activation_tokens, invites, login_attempts, activity_log.

-- institutes, subscriptions, payments, invoices: institute admin may read their own; nobody writes.
create policy "admin reads own institute" on public.institutes for select to authenticated
  using (id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');
create policy "admin reads own subscription" on public.subscriptions for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');
create policy "admin reads own payments" on public.payments for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');
create policy "admin reads own invoices" on public.invoices for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');

-- usage: admin reads own
create policy "admin reads usage" on public.monthly_active_students for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');
create policy "admin reads usage months" on public.usage_months for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');
create policy "admin reads usage alerts" on public.usage_alerts for select to authenticated
  using (institute_id = (select public.portal_institute_id()) and (select public.portal_role()) = 'institute_admin');

-- portal_users: yourself; admins see their institute; teachers see students in their batches
-- and the other staff of their institute (names on batch pages).
create policy "read portal users" on public.portal_users for select to authenticated
  using (
    id = (select auth.uid())
    or (institute_id = (select public.portal_institute_id()) and (
      (select public.portal_role()) = 'institute_admin'
      or ((select public.portal_role()) = 'teacher' and (role <> 'student' or public.teaches_student(id)))
    ))
  );

-- batches: admin all of their institute; teachers those they teach; students those they're in
create policy "read batches" on public.batches for select to authenticated
  using (
    institute_id = (select public.portal_institute_id()) and (
      (select public.portal_role()) = 'institute_admin'
      or public.is_teacher_of(id)
      or public.in_batch(id)
    )
  );

create policy "read batch teachers" on public.batch_teachers for select to authenticated
  using (
    institute_id = (select public.portal_institute_id()) and (
      (select public.portal_role()) = 'institute_admin'
      or teacher_id = (select auth.uid())
      or public.is_teacher_of(batch_id)
      or public.in_batch(batch_id)
    )
  );

create policy "read batch students" on public.batch_students for select to authenticated
  using (
    institute_id = (select public.portal_institute_id()) and (
      (select public.portal_role()) = 'institute_admin'
      or public.is_teacher_of(batch_id)
      or student_id = (select auth.uid())
    )
  );

-- student_projects: owners do everything with their own; teachers read their students'; admins read all of theirs
create policy "read projects" on public.student_projects for select to authenticated
  using (
    institute_id = (select public.portal_institute_id()) and (
      owner_id = (select auth.uid())
      or (select public.portal_role()) = 'institute_admin'
      or public.teaches_student(owner_id)
    )
  );
create policy "create own projects" on public.student_projects for insert to authenticated
  with check (owner_id = (select auth.uid()) and institute_id = (select public.portal_institute_id())
    and (batch_id is null or exists (select 1 from public.batches b where b.id = batch_id and b.institute_id = (select public.portal_institute_id()))));
create policy "update own projects" on public.student_projects for update to authenticated
  using (owner_id = (select auth.uid()) and institute_id = (select public.portal_institute_id()))
  with check (owner_id = (select auth.uid()) and institute_id = (select public.portal_institute_id()));
create policy "delete own projects" on public.student_projects for delete to authenticated
  using (owner_id = (select auth.uid()) and institute_id = (select public.portal_institute_id()));

-- Table privileges: read-only for authenticated, except projects. anon gets nothing.
-- Only the portal's own tables: this project is shared with the simulator, whose tables
-- (profiles, projects, institution_enquiries) keep their own grants untouched.
revoke all on
  public.waves, public.plans, public.wave_prices, public.reserved_slugs, public.institutes, public.slug_history,
  public.staff_users, public.portal_users, public.batches, public.batch_teachers, public.batch_students,
  public.monthly_active_students, public.usage_months, public.usage_alerts, public.subscriptions, public.payments,
  public.invoice_counters, public.invoices, public.activation_tokens, public.invites, public.login_attempts,
  public.student_projects, public.activity_log
from anon, authenticated;
grant select on public.institutes, public.subscriptions, public.payments, public.invoices,
  public.monthly_active_students, public.usage_months, public.usage_alerts,
  public.portal_users, public.batches, public.batch_teachers, public.batch_students to authenticated;
grant select, insert, update, delete on public.student_projects to authenticated;
-- projects: only these columns may be written by their owner
revoke update on public.student_projects from authenticated;
grant update (name, data, thumbnail_path, module_count, batch_id) on public.student_projects to authenticated;

-- ---------------------------------------------------------------- server-only functions (service role)

-- The student limit right now: 300 during the free period (fair use), otherwise plan + 10 per extra pack.
create or replace function public.student_limit(p_institute uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when i.status in ('approved', 'awaiting_payment', 'paid', 'onboarding', 'free_period') then 300
    else coalesce(p.student_limit + 10 * s.extra_packs, 300)
  end
  from public.institutes i
  left join public.subscriptions s on s.institute_id = i.id
  left join public.plans p on p.code = s.plan_code
  where i.id = p_institute
$$;

create or replace function public.teacher_limit(p_institute uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case
    -- no plan yet (free period): not limited until the owner decides otherwise
    when s.plan_code is null then null
    else p.teacher_limit + s.extra_teachers
  end
  from public.institutes i
  left join public.subscriptions s on s.institute_id = i.id
  left join public.plans p on p.code = s.plan_code
  where i.id = p_institute
$$;

-- Count a student once per calendar month (IST). Called by the server (proxy and sign-in) with the
-- month computed from the app clock. Returns 'counted', 'already' or 'limit_reached'. Never decrements.
create or replace function public.record_active_student(p_institute uuid, p_student uuid, p_month date)
returns text language plpgsql security definer set search_path = '' as $$
declare lim int; n int;
begin
  if exists (select 1 from public.monthly_active_students
             where institute_id = p_institute and month = p_month and student_id = p_student) then
    return 'already';
  end if;
  -- one counter per institute+month at a time, so two sign-ins can't both take the last place
  perform pg_advisory_xact_lock(hashtextextended(p_institute::text || p_month::text, 0));
  if exists (select 1 from public.monthly_active_students
             where institute_id = p_institute and month = p_month and student_id = p_student) then
    return 'already';
  end if;
  lim := public.student_limit(p_institute);
  select count(*) into n from public.monthly_active_students where institute_id = p_institute and month = p_month;
  if n >= lim then return 'limit_reached'; end if;
  insert into public.monthly_active_students (institute_id, month, student_id) values (p_institute, p_month, p_student);
  return 'counted';
end $$;

-- Give a paid institute its wave place, in one transaction. A place is taken only here, on payment.
-- Returns {result: 'paid' | 'wave_full' | 'already', member_number}.
create or replace function public.assign_wave_place(p_institute uuid, p_now timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inst public.institutes; w public.waves; taken int; num int;
begin
  select * into inst from public.institutes where id = p_institute for update;
  if not found then raise exception 'No such institute'; end if;
  if inst.member_number is not null then
    return jsonb_build_object('result', 'already', 'member_number', inst.member_number);
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

create or replace function public.next_invoice_number(p_fy text) returns int
language sql security definer set search_path = '' as $$
  insert into public.invoice_counters (fy, last) values (p_fy, 1)
  on conflict (fy) do update set last = public.invoice_counters.last + 1, updated_at = now()
  returning last
$$;

revoke execute on function public.student_limit(uuid), public.teacher_limit(uuid),
  public.record_active_student(uuid, uuid, date), public.assign_wave_place(uuid, timestamptz),
  public.next_invoice_number(text) from public, anon, authenticated;
grant execute on function public.student_limit(uuid), public.teacher_limit(uuid),
  public.record_active_student(uuid, uuid, date), public.assign_wave_place(uuid, timestamptz),
  public.next_invoice_number(text) to service_role;

-- ---------------------------------------------------------------- storage (all private except logos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('institute-logos', 'institute-logos', true, 1048576, array['image/webp', 'image/png', 'image/jpeg']),
  ('student-thumbnails', 'student-thumbnails', false, 1048576, array['image/webp']),
  ('submissions', 'submissions', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- thumbnails: <institute_id>/<owner_id>/<project_id>.webp
create or replace function public.can_read_thumb(path text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(path, '/'); owner uuid;
begin
  if array_length(parts, 1) <> 3 or parts[1] <> public.portal_institute_id()::text then return false; end if;
  if parts[2] = auth.uid()::text then return true; end if;
  if public.portal_role() = 'institute_admin' then return true; end if;
  begin owner := parts[2]::uuid; exception when others then return false; end;
  return public.teaches_student(owner);
end $$;
revoke execute on function public.can_read_thumb(text) from public, anon;
grant execute on function public.can_read_thumb(text) to authenticated;

create policy "thumbs: read" on storage.objects for select to authenticated
  using (bucket_id = 'student-thumbnails' and public.can_read_thumb(name));
create policy "thumbs: write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-thumbnails'
    and (storage.foldername(name))[1] = (select public.portal_institute_id())::text
    and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "thumbs: update own" on storage.objects for update to authenticated
  using (bucket_id = 'student-thumbnails'
    and (storage.foldername(name))[1] = (select public.portal_institute_id())::text
    and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "thumbs: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'student-thumbnails'
    and (storage.foldername(name))[1] = (select public.portal_institute_id())::text
    and (storage.foldername(name))[2] = (select auth.uid())::text);
-- logos, submissions and invoices: written and signed by server code only (service role).
