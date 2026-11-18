-- Uji RLS + state machine + IPMS. Jalankan: supabase/tests/run.sh (Postgres lokal) atau adaptasi ke Supabase test DB.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'GAGAL: %', msg; end if; raise notice 'OK   : %', msg; end $$;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, false); end $$;

-- Pengguna (akun pertama otomatis admin)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','admin@x.id'),('00000000-0000-0000-0000-0000000000b1','pembina@x.id'),
 ('00000000-0000-0000-0000-0000000000c1','ketua@x.id'),('00000000-0000-0000-0000-0000000000d1','kadiv1@x.id'),
 ('00000000-0000-0000-0000-0000000000d2','kadiv2@x.id'),('00000000-0000-0000-0000-0000000000e1','staff@x.id');
select pg_temp.assert((select role_code from profiles where email='admin@x.id')='admin','akun pertama otomatis Admin');
select pg_temp.assert((select role_code from profiles where email='staff@x.id')='staff','akun berikutnya default Staff');
select pg_temp.assert((select count(*) from roles)=5,'5 role ter-seed');

\i supabase/seed.sql
\i supabase/seed_demo.sql
update profiles set role_code='pembina' where email='pembina@x.id';
update profiles set role_code='ketua' where email='ketua@x.id';
update profiles set role_code='kadiv', division_id=(select id from divisions where code='ACR') where email='kadiv1@x.id';
update profiles set role_code='kadiv', division_id=(select id from divisions where code='HMS') where email='kadiv2@x.id';
update profiles set division_id=(select id from divisions where code='ACR') where email='staff@x.id';
update tasks set assignee_id='00000000-0000-0000-0000-0000000000e1' where title='[DEMO] Briefing MC';

set role authenticated;

-- RLS profiles / role
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
update profiles set role_code='admin' where email='staff@x.id';
select pg_temp.assert((select role_code from profiles where email='staff@x.id')='staff','staff tidak dapat menaikkan role sendiri');
select pg_temp.assert((select count(*) from tasks)=1,'staff hanya melihat tugas miliknya');
select pg_temp.assert((select count(*) from role_permissions where role_code='admin')>0,'staff dapat membaca matriks izin');
delete from role_permissions where role_code='staff';
select pg_temp.assert((select count(*) from role_permissions where role_code='staff')=2,'staff tidak dapat menghapus izin');

-- RLS tasks
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert((select count(*) from tasks)=4,'kadiv ACR hanya melihat 4 tugas divisinya');
select pg_temp.assert((select count(*) from tasks where division_id <> (select division_id from profiles where id=auth.uid()))=0,'kadiv tidak melihat tugas divisi lain');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert((select count(*) from tasks)=13,'ketua melihat seluruh tugas');

-- IPMS
select pg_temp.assert((select total_tasks from v_division_ipms where is_overall)=13,'IPMS overall total 13');
select pg_temp.assert((select ipms_score from v_division_ipms where division_code='ACR') is not null,'IPMS ACR terhitung');
select pg_temp.assert((select ipms_score from v_division_ipms where division_code='KNS') between 0 and 100,'IPMS dalam rentang 0-100');
select pg_temp.assert((select count(*) from v_task_urgency where urgency='critical')>=3,'filter urgensi kritis mengembalikan tugas');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert((select total_tasks from v_division_ipms where division_code='HMS')=0,'view IPMS mengikuti RLS (kadiv tak melihat data divisi lain)');

-- Admin: ubah role via RLS, tak bisa lockout
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update profiles set role_code='kadiv' where email='staff@x.id';
select pg_temp.assert((select role_code from profiles where email='staff@x.id')='kadiv','admin dapat mengubah role');
update profiles set role_code='staff' where email='staff@x.id';
do $$ begin update profiles set role_code='staff' where email='admin@x.id'; raise exception 'seharusnya gagal';
exception when check_violation then raise notice 'OK   : admin terakhir tidak bisa diturunkan'; end $$;
do $$ begin perform set_role_permissions('admin', array['users:read']); raise exception 'seharusnya gagal';
exception when check_violation then raise notice 'OK   : izin kritis admin tidak bisa dicabut'; end $$;
select set_role_permissions('staff', array['divisions:read','tasks:read_own','tasks:read_division']);
select pg_temp.assert((select count(*) from role_permissions where role_code='staff')=3,'admin dapat mengubah izin role');
select set_role_permissions('staff', array['divisions:read','tasks:read_own']);

-- Dokumen: state machine
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
insert into documents (id,title,category,recipient,file_path,file_name,file_size,file_mime)
values ('11111111-1111-1111-1111-111111111111','Surat izin gedung','surat_izin','Direktorat Pendidikan',
 '00000000-0000-0000-0000-0000000000d1/11111111-1111-1111-1111-111111111111/a.pdf','a.pdf',1000,'application/pdf');
select pg_temp.assert((select status from documents)='draft','dokumen baru berstatus draft');
select pg_temp.assert((select submitted_by from documents)=auth.uid(),'submitted_by dikunci ke pengguna');
select transition_document('11111111-1111-1111-1111-111111111111','submitted');
do $$ begin perform transition_document('11111111-1111-1111-1111-111111111111','approved'); raise exception 'seharusnya gagal';
exception when invalid_parameter_value then raise notice 'OK   : loncat Submitted->Approved ditolak'; end $$;
do $$ begin perform transition_document('11111111-1111-1111-1111-111111111111','reviewed'); raise exception 'seharusnya gagal';
exception when insufficient_privilege then raise notice 'OK   : pengaju tidak bisa mereviu sendiri'; end $$;
select pg_temp.assert((select count(*) from documents)=1,'kadiv melihat dokumen sendiri');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select pg_temp.assert((select count(*) from documents)=0,'kadiv divisi lain tidak melihat dokumen');
do $$ begin perform transition_document('11111111-1111-1111-1111-111111111111','reviewed'); raise exception 'seharusnya gagal';
exception when no_data_found then raise notice 'OK   : kadiv lain tidak bisa mengubah status (404)'; end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin perform transition_document('11111111-1111-1111-1111-111111111111','approved'); raise exception 'seharusnya gagal';
exception when invalid_parameter_value then raise notice 'OK   : pembina belum bisa approve sebelum Reviewed'; end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert((select count(*) from document_available_transitions('11111111-1111-1111-1111-111111111111'))=3,'ketua punya 3 transisi dari Submitted');
do $$ begin perform transition_document('11111111-1111-1111-1111-111111111111','revision_needed'); raise exception 'seharusnya gagal';
exception when check_violation then raise notice 'OK   : catatan revisi wajib'; end $$;
select transition_document('11111111-1111-1111-1111-111111111111','revision_needed','Lengkapi tanda tangan');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select pg_temp.assert((select count(*) from notifications where title='Surat perlu revisi')=1,'pengaju menerima notifikasi revisi');
select transition_document('11111111-1111-1111-1111-111111111111','submitted',null,
  '00000000-0000-0000-0000-0000000000d1/11111111-1111-1111-1111-111111111111/b.pdf','b.pdf',2000,'application/pdf');
select pg_temp.assert((select revision_no from documents)=1,'ajukan ulang dengan berkas baru menaikkan revision_no');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select transition_document('11111111-1111-1111-1111-111111111111','reviewed');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert((select count(*) from notifications where title='Surat menunggu persetujuan')=1,'pembina diberi notifikasi menunggu persetujuan');
select transition_document('11111111-1111-1111-1111-111111111111','approved','Disetujui');
select pg_temp.assert((select status from documents)='approved','dokumen Approved');
select pg_temp.assert((select count(*) from document_status_history)=6,'riwayat mencatat 6 perubahan beserta aktor');
select pg_temp.assert((select count(*) from document_status_history where actor_id is null)=0,'setiap riwayat memiliki aktor');
reset role;
select pg_temp.assert((select status from documents)='approved','status tidak dapat diubah langsung (tanpa policy UPDATE)');

-- staff tak bisa membuat dokumen
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
do $$ begin insert into documents (title,category,recipient,file_path,file_name,file_size,file_mime)
 values ('x y z','lainnya','abc','p','a.pdf',1,'application/pdf'); raise exception 'seharusnya gagal';
exception when insufficient_privilege then raise notice 'OK   : staff tidak boleh mengajukan dokumen (RLS)'; end $$;
select pg_temp.assert((select count(*) from documents)=0,'staff tidak melihat dokumen');

-- anon ditolak total
reset role; set role anon;
do $$ begin perform 1 from tasks; raise exception 'seharusnya gagal';
exception when insufficient_privilege then raise notice 'OK   : anon ditolak membaca tasks'; end $$;
reset role;
\echo SEMUA UJI LULUS
