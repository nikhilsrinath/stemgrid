-- StemGrid accounts: profiles, saved projects, avatar + thumbnail storage.
-- Every table has RLS: a user only ever sees and changes their own rows.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     extensions.citext unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 50),
  avatar_url   text check (char_length(avatar_url) <= 1024),
  role         text check (role in ('student', 'teacher', 'maker')),
  bio          text not null default '' check (char_length(bio) <= 280),
  onboarded    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- A profile row is created for every new auth user (email or Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), split_part(new.email, '@', 1), ''), 50),
    left(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), 1024)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Live "is this @username free?" check for onboarding (profiles are otherwise private).
create or replace function public.username_available(u text)
returns boolean language sql stable security definer set search_path = '' as $$
  select u ~ '^[a-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles p
       where p.username = u::extensions.citext and p.id <> (select auth.uid())
     );
$$;
revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- Removes the caller's account; profile, projects cascade.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from storage.objects where bucket_id in ('avatars', 'thumbnails') and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- projects
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name           text not null default 'Untitled build' check (char_length(name) between 1 and 80),
  data           jsonb not null default '{}'::jsonb check (pg_column_size(data) < 1048576),
  thumbnail_path text check (char_length(thumbnail_path) <= 300),
  module_count   integer not null default 0 check (module_count >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index projects_owner_updated on public.projects (owner_id, updated_at desc);

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "Read own projects" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own projects" on public.projects
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own projects" on public.projects
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------- storage
-- Public-read buckets; files live under "<user id>/..." and only that user can write there.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
  ('thumbnails', 'thumbnails', true, 1048576, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy "Upload own files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Update own files" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);
-- upsert needs select on the existing object
create policy "Read own files" on storage.objects
  for select to authenticated
  using (bucket_id in ('avatars', 'thumbnails') and (storage.foldername(name))[1] = (select auth.uid())::text);
