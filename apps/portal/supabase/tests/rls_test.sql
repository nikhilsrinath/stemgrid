-- RLS policy tests (brief §5.2, §17). Run with: cd apps/portal && supabase test db
-- Two institutes, A and B. Signed in as people at A, nothing of B may be visible, and portal users
-- may not write anything except their own projects.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- ---------------------------------------------------------------- fixtures (as the table owner)
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@a.test'),
  ('a0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher@a.test'),
  ('a0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stu1@a.test'),
  ('a0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stu2@a.test'),
  ('b0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@b.test'),
  ('b0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stu@b.test');

insert into public.institutes (id, slug, name, contact_email, status) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'inst-a', 'Institute A', 'a@a.test', 'free_period'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'inst-b', 'Institute B', 'b@b.test', 'free_period');

insert into public.portal_users (id, institute_id, role, display_name, username, email) values
  ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'institute_admin', 'Admin A', null, 'admin@a.test'),
  ('a0000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000000', 'teacher', 'Teacher A', null, 'teacher@a.test'),
  ('a0000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000000', 'student', 'Student A1', 'stu-a1', null),
  ('a0000000-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-000000000000', 'student', 'Student A2', 'stu-a2', null),
  ('b0000000-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'institute_admin', 'Admin B', null, 'admin@b.test'),
  ('b0000000-0000-0000-0000-00000000000c', 'bbbbbbbb-0000-0000-0000-000000000000', 'student', 'Student B', 'stu-b', null);

insert into public.batches (id, institute_id, name, join_code) values
  ('aaaa0000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'A taught', 'AAAAA2'),
  ('aaaa0000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'A not taught', 'AAAAA3'),
  ('bbbb0000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'B batch', 'BBBBB2');
insert into public.batch_teachers (batch_id, teacher_id, institute_id) values
  ('aaaa0000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000000');
insert into public.batch_students (batch_id, student_id, institute_id) values
  ('aaaa0000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000000'),
  ('aaaa0000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-000000000000'),
  ('bbbb0000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000c', 'bbbbbbbb-0000-0000-0000-000000000000');
insert into public.student_projects (id, institute_id, owner_id, name) values
  ('aaaa1111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000c', 'A1 build'),
  ('aaaa1111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000d', 'A2 build'),
  ('bbbb1111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-00000000000c', 'B build');
insert into public.payments (id, institute_id, kind, amount_paise, gst_paise, provider, status) values
  ('aaaa2222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'joining', 550000, 99000, 'manual', 'paid'),
  ('bbbb2222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'joining', 550000, 99000, 'manual', 'paid');
insert into public.invoices (institute_id, payment_id, number, amount_paise, gst_paise) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaa2222-0000-0000-0000-000000000001', 'SG/TEST/0001', 550000, 99000),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'bbbb2222-0000-0000-0000-000000000001', 'SG/TEST/0002', 550000, 99000);

create or replace function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------- teacher at A
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.batches where institute_id = 'bbbbbbbb-0000-0000-0000-000000000000')::int, 0, 'teacher A: no batch of B');
select is((select count(*) from public.batches)::int, 1, 'teacher A: only the batch they teach');
select is((select count(*) from public.portal_users where institute_id = 'bbbbbbbb-0000-0000-0000-000000000000')::int, 0, 'teacher A: no user of B');
select is((select count(*) from public.portal_users where role = 'student')::int, 1, 'teacher A: only students in their batches');
select is((select count(*) from public.invoices)::int, 0, 'teacher A: no invoices at all');
select is((select count(*) from public.payments)::int, 0, 'teacher A: no payments');
select is((select count(*) from public.institutes)::int, 0, 'teacher A: institutes row is admin-only');
select is((select count(*) from public.student_projects where institute_id = 'bbbbbbbb-0000-0000-0000-000000000000')::int, 0, 'teacher A: no project of B');
select is((select count(*) from public.student_projects)::int, 1, 'teacher A: only projects of their students');
select is((select count(*) from public.batch_students where institute_id = 'bbbbbbbb-0000-0000-0000-000000000000')::int, 0, 'teacher A: no roster of B');
select throws_ok($$ update public.batches set name = 'x' $$, '42501', null, 'teacher A: cannot write batches');
select throws_ok($$ select * from public.activity_log $$, '42501', null, 'teacher A: no activity log access');

-- ---------------------------------------------------------------- admin at A
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000a');
select is((select count(*) from public.batches)::int, 2, 'admin A: all of A''s batches');
select is((select count(*) from public.invoices)::int, 1, 'admin A: own invoice only');
select is((select count(*) from public.institutes)::int, 1, 'admin A: own institute only');
select is((select count(*) from public.student_projects where institute_id = 'bbbbbbbb-0000-0000-0000-000000000000')::int, 0, 'admin A: no project of B');
select throws_ok($$ update public.institutes set status = 'active' $$, '42501', null, 'admin A: cannot change institute status through the API');
select throws_ok($$ select * from public.waves $$, '42501', null, 'admin A: no access to pricing tables');

-- ---------------------------------------------------------------- student at A
select pg_temp.as_user('a0000000-0000-0000-0000-00000000000c');
select is((select count(*) from public.portal_users)::int, 1, 'student A1: only their own row');
select is((select count(*) from public.student_projects)::int, 1, 'student A1: only their own project');
select is((select count(*) from public.batches)::int, 1, 'student A1: only batches they are in');
select lives_ok($$ insert into public.student_projects (institute_id, owner_id, name) values ('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000c', 'new') $$, 'student A1: can create own project');
select throws_ok($$ insert into public.student_projects (institute_id, owner_id, name) values ('bbbbbbbb-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000c', 'sneaky') $$, '42501', null, 'student A1: cannot create a project in B');
select is((with u as (update public.student_projects set name = 'hacked' where id = 'aaaa1111-0000-0000-0000-000000000002' returning 1) select count(*) from u)::int, 0, 'student A1: cannot edit a classmate''s project');

select * from finish();
rollback;
