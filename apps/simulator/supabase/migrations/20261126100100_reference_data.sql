-- Reference data from the membership terms (PORTAL_BUILD_BRIEF.md §2). All money in paise, before 18% GST.
-- The UI never hardcodes prices: it reads these tables.

insert into public.waves (code, name, places, join_price_paise, first_month_paise, onboarding_paise, bundle_saving_paise, free_months, sort) values
  ('founding', 'Founding Partners', 10, 550000, 350000, 250000, 50000, 3, 1),
  ('charter',  'Charter Members',   10, 600000, 400000, 250000, 50000, 2, 2)
on conflict (code) do nothing;

insert into public.plans (code, name, student_limit, teacher_limit, regular_price_paise, sort) values
  ('starter', 'Starter', 30, 2, 500000, 1),
  ('growth',  'Growth',  90, 5, 1200000, 2),
  ('pro',     'Pro',    180, 10, 2000000, 3)
on conflict (code) do nothing;

insert into public.wave_prices (wave_id, plan_code, price_paise, extra_pack_paise, extra_teacher_paise)
select w.id, v.plan, v.price, v.pack, 50000
from public.waves w
join (values
  ('founding', 'starter',  350000, 160000),
  ('founding', 'growth',   900000, 160000),
  ('founding', 'pro',     1600000, 160000),
  ('charter',  'starter',  400000, 180000),
  ('charter',  'growth',  1000000, 180000),
  ('charter',  'pro',     1800000, 180000)
) as v(wave, plan, price, pack) on v.wave = w.code
on conflict do nothing;

-- Slugs that can never be an institute (brief §5.1), plus the portal's own top-level routes.
insert into public.reserved_slugs (slug) values
  ('admin'), ('api'), ('login'), ('logout'), ('join'), ('invite'), ('activate'), ('reset'), ('help'),
  ('console'), ('static'), ('assets'), ('_next'), ('www'), ('learn'), ('app'), ('support'), ('billing'),
  ('dev'), ('auth'), ('privacy'), ('terms'), ('find'), ('pay'), ('closed')
on conflict do nothing;
