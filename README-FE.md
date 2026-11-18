# CENTRA — Frontend (zip FE)

Isi: seluruh proyek Next.js selain bagian backend — halaman (`app/login`, `app/(app)/**`), `components/`, `lib/format.ts`, `lib/supabase/client.ts`,
konfigurasi (package.json, tsconfig, tailwind/css) dan file bersama (`lib/rbac.ts`, `lib/auth/*`, `lib/dashboard.ts`, `lib/documents/shared.ts`).

Zip FE membutuhkan zip BE (API, `proxy.ts`, migrasi Supabase) agar bisa berjalan: ekstrak FE, lalu BE ke folder yang sama,
`pnpm install`, isi `.env.local`, `pnpm dev`.
