begin;

-- 0. Siapkan user uji sementara (trigger di 0001 otomatis membuat baris di public.profiles)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'pembina.test@centra.id'),
  ('00000000-0000-0000-0000-0000000000c1', 'ketua.test@centra.id'),
  ('00000000-0000-0000-0000-0000000000d1', 'kadiv.test@centra.id'),
  ('00000000-0000-0000-0000-0000000000e1', 'staff.test@centra.id')
on conflict (id) do nothing;

insert into public.divisions (code, name, sort_order)
values ('ACR', 'Acara', 1)
on conflict (code) do nothing;

update public.profiles set role_code = 'pembina', is_active = true
where id = '00000000-0000-0000-0000-0000000000b1';

update public.profiles set role_code = 'ketua', is_active = true
where id = '00000000-0000-0000-0000-0000000000c1';

update public.profiles set role_code = 'kadiv', is_active = true,
  division_id = (select id from public.divisions where code = 'ACR')
where id = '00000000-0000-0000-0000-0000000000d1';

update public.profiles set role_code = 'staff', is_active = true,
  division_id = (select id from public.divisions where code = 'ACR')
where id = '00000000-0000-0000-0000-0000000000e1';

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'GAGAL: %', msg; end if;
  raise notice 'OK   : %', msg;
end $$;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u::text, 'role', 'authenticated')::text, true);
end $$;

set local role authenticated;

-- 1. Pembina membuat arahan strategis -> Ketua menindaklanjuti
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.strategic_directives (title, content, priority, created_by)
values ('Percepatan Proposal Sponsor Utama', 'Pastikan proposal masuk sebelum Jumat pukul 17.00 WIB.', 'critical', '00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert((select count(*) from public.strategic_directives where status = 'unread') = 1, 'pembina dapat membuat arahan strategis');
select pg_temp.assert((select count(*) from public.audit_logs where entity_type = 'directive') >= 1, 'arahan baru otomatis tercatat di audit_logs');

-- Staff tidak boleh baca audit_logs maupun strategic_directives
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert((select count(*) from public.audit_logs) = 0, 'staff tidak dapat melihat audit_logs');
select pg_temp.assert((select count(*) from public.strategic_directives) = 0, 'staff tidak dapat melihat arahan strategis');

-- Ketua resolve arahan Pembina
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.strategic_directives
set status = 'resolved', resolved_by = '00000000-0000-0000-0000-0000000000c1', resolved_at = now(), resolution_note = 'Sudah ditindaklanjuti divisi HMS'
where status = 'unread';
select pg_temp.assert((select count(*) from public.strategic_directives where status = 'resolved') = 1, 'ketua dapat menyelesaikan arahan strategis');

-- 2. Workload view & bottleneck detection
select pg_temp.assert((select count(*) from public.v_division_workload) >= 1, 'v_division_workload menampilkan data divisi');

-- 3. Kadiv ACR membuat tugas divisi ACR
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
insert into public.tasks (title, division_id, assignee_id, priority, weight, sub_event)
values ('Cek Rundown Opening', (select id from public.divisions where code = 'ACR'), '00000000-0000-0000-0000-0000000000e1', 'high', 3, 'Opening Ceremony');
select pg_temp.assert((select count(*) from public.tasks where title = 'Cek Rundown Opening') = 1, 'kadiv dapat membuat tugas di divisinya');

-- 4. Staff update status 1-klik + tulis komentar forum tugas
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
update public.tasks set status = 'in_progress' where title = 'Cek Rundown Opening';
select pg_temp.assert((select status from public.tasks where title = 'Cek Rundown Opening') = 'in_progress', 'staff dapat memperbarui status tugas miliknya');

insert into public.task_comments (task_id, author_id, body)
select id, '00000000-0000-0000-0000-0000000000e1', 'Draft rundown tahap 1 siap direview.'
from public.tasks where title = 'Cek Rundown Opening';
select pg_temp.assert((select count(*) from public.task_comments) = 1, 'staff dapat menulis komentar pada tugasnya');

rollback;