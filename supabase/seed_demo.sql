-- OPSIONAL (hanya dev/staging): tugas contoh agar dashboard IPMS terisi.
-- Jalankan setelah seed.sql. Hapus dengan: delete from public.tasks where title like '[DEMO]%';
insert into public.tasks (title, division_id, priority, status, weight, due_date)
select '[DEMO] ' || x.title, d.id, x.priority::public.task_priority, x.status::public.task_status, x.weight,
       now() + (x.days || ' days')::interval
from (values
  ('ACR','Susun rundown final','high','in_progress',3,2),
  ('ACR','Briefing MC','medium','todo',2,6),
  ('ACR','Gladi resik','critical','todo',4,1),
  ('ACR','Konfirmasi pengisi acara','medium','done',2,-3),
  ('HMS','Kirim proposal sponsor batch 2','high','in_progress',3,-1),
  ('HMS','Follow-up media partner','medium','todo',2,5),
  ('HMS','Kontrak sponsor utama','critical','done',5,-5),
  ('PRL','Sewa sound system','high','todo',3,3),
  ('PRL','Inventaris perlengkapan','low','done',1,-6),
  ('DKP','Desain poster','medium','done',2,-4),
  ('DKP','Liputan hari-H','medium','todo',2,10),
  ('KNS','Survei katering','medium','in_progress',2,4),
  ('SEK','Surat izin gedung','critical','in_progress',4,1)
) as x(div, title, priority, status, weight, days)
join public.divisions d on d.code = x.div;
