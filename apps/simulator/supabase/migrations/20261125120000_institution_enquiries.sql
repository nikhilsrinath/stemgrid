-- Institution enquiries: the "For my institution" sign-up path. Schools, academies, colleges,
-- companies and resellers tell us who they are and what they need; the team follows up.
-- Anyone (signed in or not) may insert. Nobody can read rows through the API: the team
-- reads them in the Supabase dashboard (Table editor) or with the service role.

create table public.institution_enquiries (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique check (ref ~ '^SG-[A-Z0-9]{6}$'),
  -- the institution
  org_name      text not null check (char_length(org_name) between 2 and 120),
  org_type      text not null check (char_length(org_type) <= 60),
  curriculum    text check (char_length(curriculum) <= 60),
  website       text check (char_length(website) <= 200),
  city          text not null check (char_length(city) between 1 and 80),
  region        text not null check (char_length(region) between 1 and 80),
  country       text not null default 'India' check (char_length(country) between 1 and 60),
  learners      text not null check (char_length(learners) <= 40),
  levels        text[] not null default '{}' check (cardinality(levels) <= 12),
  -- the person we talk to
  contact_name  text not null check (char_length(contact_name) between 2 and 80),
  designation   text not null check (char_length(designation) <= 80),
  email         text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 160),
  phone         text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  channel       text check (char_length(channel) <= 30),
  best_time     text check (char_length(best_time) <= 30),
  -- what they need
  interests     text[] not null check (cardinality(interests) between 1 and 12),
  current_setup text check (char_length(current_setup) <= 80),
  timeline      text not null check (char_length(timeline) <= 60),
  decision_role text check (char_length(decision_role) <= 60),
  budget        text check (char_length(budget) <= 60),
  heard_from    text check (char_length(heard_from) <= 60),
  message       text not null default '' check (char_length(message) <= 2000),
  consent       boolean not null check (consent),
  -- for the team's follow-up
  status        text not null default 'new' check (status in ('new', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'spam')),
  notes         text not null default '',
  user_id       uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

create index institution_enquiries_created on public.institution_enquiries (created_at desc);
create index institution_enquiries_status on public.institution_enquiries (status, created_at desc);

alter table public.institution_enquiries enable row level security;

-- Insert only, and only as a fresh enquiry (the team owns status and notes).
create policy "Anyone can send an enquiry" on public.institution_enquiries
  for insert to anon, authenticated
  with check (status = 'new' and notes = '' and (user_id is null or user_id = (select auth.uid())));

revoke all on public.institution_enquiries from anon, authenticated;
grant insert on public.institution_enquiries to anon, authenticated;
