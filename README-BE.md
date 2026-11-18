# CENTRA — Backend (zip BE)

Isi: `supabase/` (migrasi 0001–0004, seed, uji SQL), `app/api/**` (Route Handlers), `proxy.ts` (guard sesi + RBAC),
`lib/api.ts`, `lib/documents/upload.ts`, dan `docs/` (dokumentasi Sprint 0–1).
File di `lib/` yang dipakai bersama (rbac, dashboard, documents/shared, auth/*, supabase/server & env) ada identik di zip FE.

**Cara pakai:** ekstrak zip FE ke folder proyek, lalu ekstrak zip BE ke folder yang SAMA (timpa jika ditanya). Setelah itu
`pnpm install`, isi `.env.local`, jalankan migrasi di Supabase (lihat `docs/README.md` dan `supabase/`), `pnpm dev`.
Zip BE tidak dapat dijalankan sendiri tanpa FE.
