-- LOCAL TESTING ONLY. `supabase db reset` runs this after the migrations on the local stack.
-- It is never applied to a live project (`supabase db push` doesn't run seeds).
-- Demo users, institutes and batches are created by scripts/seed-demo.mjs (auth users need the admin API).

-- The dev toolbar's "force status" dropdown: jump an institute to any status to see how it looks,
-- bypassing the transition guard, and fill in the dates that status needs.
create or replace function public.dev_force_status(p_institute uuid, p_status public.institute_status, p_now timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('sg.force_status', 'on', true);
  update public.institutes set
    status = p_status,
    paid_at = case when p_status not in ('approved', 'awaiting_payment', 'rejected') then coalesce(paid_at, p_now - interval '10 days') else paid_at end,
    member_number = case when p_status not in ('approved', 'awaiting_payment', 'rejected') and member_number is null
                         then (select coalesce(max(member_number), 0) + 1 from public.institutes) else member_number end,
    go_live_at = case when p_status in ('free_period', 'active', 'grace', 'suspended', 'lapsed') then coalesce(go_live_at, p_now - interval '3 days') else go_live_at end,
    free_period_ends_at = case when p_status = 'free_period' then greatest(coalesce(free_period_ends_at, p_now + interval '60 days'), p_now + interval '1 day')
                               when p_status in ('active', 'grace', 'suspended', 'lapsed') then least(coalesce(free_period_ends_at, p_now - interval '1 day'), p_now - interval '1 day')
                               else free_period_ends_at end,
    minimum_term_ends_at = coalesce(minimum_term_ends_at, p_now + interval '90 days'),
    lock_ends_at = coalesce(lock_ends_at, p_now + interval '3 years'),
    grace_started_at = case when p_status in ('grace', 'suspended', 'lapsed') then coalesce(grace_started_at, p_now) else null end,
    payment_due_at = case when p_status in ('grace', 'suspended', 'lapsed') then coalesce(payment_due_at, p_now) else null end,
    suspended_at = case when p_status in ('suspended', 'lapsed') then coalesce(suspended_at, p_now) else null end,
    lapsed_at = case when p_status = 'lapsed' then coalesce(lapsed_at, p_now) else null end,
    lock_lost = (p_status = 'lapsed') or (lock_lost and p_status not in ('active', 'free_period', 'grace')),
    wave_full = false
  where id = p_institute;
  -- an institute past its free period needs a plan
  if p_status in ('active', 'grace', 'suspended', 'lapsed') then
    insert into public.subscriptions (institute_id, plan_code, price_paise, status)
    select p_institute, 'starter', wp.price_paise, 'active'
    from public.institutes i join public.wave_prices wp on wp.wave_id = i.wave_id and wp.plan_code = 'starter'
    where i.id = p_institute
    on conflict (institute_id) do update set plan_code = coalesce(public.subscriptions.plan_code, excluded.plan_code),
      price_paise = coalesce(public.subscriptions.price_paise, excluded.price_paise);
  end if;
end $$;
revoke execute on function public.dev_force_status(uuid, public.institute_status, timestamptz) from public, anon, authenticated;
grant execute on function public.dev_force_status(uuid, public.institute_status, timestamptz) to service_role;
