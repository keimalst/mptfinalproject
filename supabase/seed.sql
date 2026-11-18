-- Data awal divisi (idempotent). Sesuaikan dengan struktur kepanitiaan Anda.
insert into public.divisions (code, name, description, sort_order) values
  ('ACR', 'Acara',                  'Rundown, MC, dan pelaksanaan acara', 1),
  ('HMS', 'Humas & Sponsorship',    'Relasi eksternal dan pendanaan', 2),
  ('PRL', 'Perlengkapan',           'Logistik dan peralatan', 3),
  ('DKP', 'Dokumentasi & Publikasi','Media, desain, dan dokumentasi', 4),
  ('KNS', 'Konsumsi',               'Konsumsi peserta dan panitia', 5),
  ('SEK', 'Kesekretariatan',        'Persuratan dan administrasi', 6)
on conflict (code) do nothing;
