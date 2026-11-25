-- Business contacts: the short "Talk to us" form on stemgrid.in (companies, partners, CSR teams,
-- resellers). Five fields only. Rows arrive through the simulator's /api/contact route.
-- Anyone may insert. Nobody can read rows through the API: the team reads them in the Supabase
-- dashboard (Table editor) or with the service role.

create table public.business_contacts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  company     text not null check (char_length(company) between 2 and 120),
  email       text not null check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 160),
  phone       text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  message     text not null check (char_length(message) between 5 and 2000),
  source      text not null default 'stemgrid.in' check (char_length(source) <= 60),
  -- for the team's follow-up
  status      text not null default 'new' check (status in ('new', 'contacted', 'closed', 'spam')),
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create index business_contacts_created on public.business_contacts (created_at desc);

alter table public.business_contacts enable row level security;

-- Insert only, and only as a fresh contact (the team owns status and notes).
create policy "Anyone can send a business contact" on public.business_contacts
  for insert to anon, authenticated
  with check (status = 'new' and notes = '');

revoke all on public.business_contacts from anon, authenticated;
grant insert on public.business_contacts to anon, authenticated;
