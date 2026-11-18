# CENTRA

Tata kelola kepanitiaan kampus — RBAC 5 role, dashboard progres & skor IPMS, dan persuratan birokrasi.
Next.js (App Router, Cache Components) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, RLS, Storage, Realtime).

Cakupan paket ini: **Sprint 0** (dokumentasi inisiasi, ERD, RLS, wireframe, risiko) dan **Sprint 1** (US-01, US-04 REV, US-05).
Sprint 2 (US-02, US-03, US-06) belum dikerjakan.

## Mulai cepat
```bash
pnpm install
cp .env.example .env.local        # isi URL + publishable/anon key Supabase
```
1. Di Supabase **SQL Editor** (atau `supabase db push`), jalankan berurutan `supabase/migrations/0001…0004`, lalu `supabase/seed.sql`
   (opsional dev: `supabase/seed_demo.sql` agar dashboard terisi).
2. Supabase → Authentication: buat user pertama (lewat **Add user**). **Akun pertama otomatis menjadi Admin.**
   Setelah itu matikan *Allow new users to sign up* agar akun hanya dibuat oleh Anda.
3. `pnpm dev` → http://localhost:3000, login, buka **Pengguna & Role** untuk menetapkan role + divisi.
4. Realtime: pastikan publikasi `supabase_realtime` aktif (migrasi menambahkan tabel otomatis).

## Skrip
`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test:sql` (uji RLS/state machine/IPMS pada Postgres lokal:
`PGURL=postgres://user:pass@localhost:5432/centra_test pnpm test:sql`, memakai stub skema Supabase)

## Catatan arsitektur
- Next.js 16: `middleware` diganti **`proxy.ts`**; sesi di-refresh dengan `@supabase/ssr`; 403 ditegakkan di proxy, di tiap Route Handler, dan terutama di **RLS**.
- Aturan state machine surat ada di database (`document_transitions` + RPC `transition_document`), bukan di UI.
- Berkas surat: bucket privat `documents`, PDF/DOCX ≤ 10 MB, akses via signed URL.
- Dokumentasi lengkap: `docs/README.md`.

## Belum diverifikasi
UI belum diuji end-to-end terhadap proyek Supabase nyata (sandbox pembuatan tidak punya akses ke Supabase). Yang sudah diuji:
migrasi + RLS + RPC (Postgres lokal), typecheck, lint, build produksi, dan perilaku tanpa-login (redirect 307 / 401).
