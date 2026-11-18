# Register Risiko R1–R6

> Daftar ini **usulan** (PDF hanya menyebut R6 secara eksplisit). Validasi bersama tim `[ISI/VALIDASI]`.

| ID | Risiko | Dampak | Mitigasi | Backlog |
|---|---|---|---|---|
| R1 | Kebocoran data lintas divisi (RLS salah) | Tinggi | RLS per tabel + uji otomatis `supabase/tests/rls_test.sql` | US-01 BE (S1) |
| R2 | Akses API langsung melewati UI | Tinggi | Guard di proxy + tiap Route Handler + RLS | US-01 BE (S1) |
| R3 | Formula IPMS dianggap tidak adil/bias | Sedang | Spesifikasi tertulis, diverifikasi BE, bobot dapat disesuaikan | US-04 Analyst (S1) |
| R4 | Berkas surat berbahaya/terlalu besar | Sedang | Batas 10 MB, whitelist MIME + magic bytes, bucket privat + signed URL | US-05 BE (S1) |
| R5 | Velocity tidak konsisten antar-sprint | Sedang | Burn-up chart, laporan velocity S1 vs S2 | Sprint 2 Scrum |
| R6 | Resistensi adopsi staff | Tinggi | UI ringkas, update status ≤ 2 klik, auto-reminder | US-06 (S2) |
