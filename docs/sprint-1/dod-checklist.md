# Definition of Done — 7 kriteria & verifikasi Sprint 1

| # | Kriteria | Bukti / status |
|---|---|---|
| 1 | Memenuhi seluruh Acceptance Criteria story | Dipetakan di bawah |
| 2 | Kode lolos `pnpm lint`, `pnpm typecheck` | ✅ dijalankan saat build paket ini |
| 3 | `pnpm build` produksi sukses | ✅ |
| 4 | Keamanan data ditegakkan di DB (RLS) & diuji | ✅ `pnpm test:sql` (39 pernyataan lulus pada Postgres 16 dengan stub Supabase) |
| 5 | Tanpa bug kritikal pada alur utama | ⚠️ perlu uji manual terhadap proyek Supabase nyata (lihat di bawah) |
| 6 | Responsif desktop & mobile | ⚠️ perlu pemeriksaan visual oleh FE/PO |
| 7 | Terdokumentasi & disetujui PO (sign-off) | Dokumen ini; **sign-off oleh PO belum dilakukan** |

## Pemetaan Acceptance Criteria
- **US-01**: 5 role ter-seed otomatis (migrasi); proxy + RLS membatasi akses; `/login` redirect; 403 pada API/halaman; Admin ubah role & izin dari UI.
- **US-04 REV**: dashboard menampilkan % progres & IPMS per divisi; filter urgensi tanpa reload; update real-time via Supabase Realtime (publikasi `tasks`); `GET ?urgency=critical`.
- **US-05**: unggah PDF/DOCX (≤ 10 MB, MIME + magic bytes); state machine; riwayat + catatan revisi; stepper real-time; signed URL.

## Skenario uji manual (pada Supabase nyata)
1. Daftar akun pertama → otomatis Admin. 2. Buat akun Kadiv/Ketua/Pembina, set role+divisi di **Pengguna & Role**.
3. Jalankan `seed.sql` (+ `seed_demo.sql`). 4. Login Kadiv → ajukan surat PDF → login Ketua → review → login Pembina → setujui.
5. Ubah status satu tugas di Supabase Studio → dashboard memperbarui diri tanpa reload.
