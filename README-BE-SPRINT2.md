# CENTRA — Backend Patch Sprint 2 (Start <= 2026-11-25)

Berisi seluruh artefak Backend untuk Sprint 2:
- `supabase/migrations/0005_audit_directives.sql` (`[US-02][BE]` Audit Log & Arahan Strategis)
- `supabase/migrations/0006_workload_bottleneck.sql` (`[US-03][BE]` Agregasi Beban Kerja & Deteksi Bottleneck)
- `supabase/migrations/0007_tasks_collaboration.sql` (`[US-06][BE]` RLS Tugas Lintas Divisi, Forum Sub-Event, & Cron Auto-Reminder)
- `supabase/tests/rls_test_sprint2.sql` (Uji otomatis SQL RLS & view Sprint 2)
- `app/api/audit-logs/**`, `app/api/directives/**`, `app/api/workload/**`, `app/api/tasks/**`, `app/api/cron/reminders/**`
- `lib/audit.ts`, `lib/workload.ts`, `lib/rbac.ts` (shared), `proxy.ts`, `.env.example`, dan `docs/sprint-2/api-reference-sprint2.md`

**Cara pasang ke repo utama:**
1. Ekstrak zip ini ke root proyek `centra` (timpa `lib/rbac.ts`, `proxy.ts`, dan `.env.example` jika diminta).
2. Jalankan migrasi `0005` s.d. `0007` di Supabase SQL Editor (atau `supabase db push`).
3. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` dan `CRON_SECRET` di `.env.local`.
4. Jalankan `pnpm typecheck` dan `pnpm lint`.
