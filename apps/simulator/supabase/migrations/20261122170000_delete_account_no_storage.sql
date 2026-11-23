-- Supabase blocks deleting storage.objects rows from SQL ("use the Storage API instead"),
-- so delete_my_account only removes the auth user now (profile and projects cascade).
-- The deleteAccount server action removes the user's avatar and thumbnail files first.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
