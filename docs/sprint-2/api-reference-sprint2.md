# Referensi API & Skema Backend — Sprint 2 (Start <= 25-11-2026)

Dokumen ini melengkapi `docs/sprint-1/api-reference.md` untuk cakupan Sprint 2 (`US-02`, `US-03`, dan `US-06` bagian Backend).

## 1. Migrasi Database (`supabase/migrations/`)
- `0005_audit_directives.sql`: Izin baru Sprint 2, tabel `audit_logs` (append-only + trigger otomatis dari `document_status_history` & `profiles`), serta `strategic_directives` (arahan Pembina -> Ketua Pelaksana + notifikasi otomatis).
- `0006_workload_bottleneck.sql`: View `v_member_workload` dan `v_division_workload` (`security_invoker = true`) untuk deteksi *bottleneck* (utilisasi >= 85%, tugas kritis >= 3, atau tugas terlambat >= 2).
- `0007_tasks_collaboration.sql`: Kolom `sub_event` & `reminder_sent_at` pada `tasks`, RLS policy `INSERT`/`UPDATE`/`DELETE` tabel `tasks`, trigger notifikasi penugasan, tabel forum `task_comments`, dan RPC `send_due_task_reminders()`.

## 2. Endpoint REST Baru

| Method & Path | Izin | Keterangan |
|---|---|---|
| `GET /api/audit-logs` | `audit:read` | Rekam jejak aktivitas (`?entity_type=&division_id=&limit=`). |
| `GET /api/directives` | `directives:read` | Daftar arahan strategis Pembina (`?status=unread\|acknowledged\|resolved`). |
| `POST /api/directives` | `directives:create` | Pembina membuat catatan arahan strategis baru. |
| `PATCH /api/directives` | `directives:resolve` | Ketua menandai arahan sebagai `acknowledged` atau `resolved`. |
| `GET /api/workload/divisions` | `workload:read_*` | Agregasi beban kerja divisi, anggota, dan daftar *bottleneck* (`?division_id=`). |
| `GET /api/tasks` | `tasks:read_*` | Daftar tugas lintas/dalam divisi (`?division_id=&status=&sub_event=&mine=1`). |
| `POST /api/tasks` | `tasks:create` | Delegasi tugas baru (lintas divisi untuk Ketua/Admin, divisi sendiri untuk Kadiv). |
| `PATCH /api/tasks/[id]` | `tasks:update_*` | Pembaruan status 1-klik (Staff) atau detail tugas lengkap (Kadiv/Ketua/Admin). |
| `GET /api/tasks/[id]/comments` | `tasks:read_*` | Riwayat diskusi per tugas / sub-event. |
| `POST /api/tasks/[id]/comments` | `tasks:read_*` | Tambah komentar baru pada tugas terkait. |
| `POST /api/cron/reminders` | `Bearer CRON_SECRET` | Trigger terjadwal RPC `send_due_task_reminders()` untuk tenggat < 24 jam. |

## 3. Variabel Lingkungan Tambahan (`.env.local`)
- `SUPABASE_SERVICE_ROLE_KEY`: Kunci service role Supabase khusus untuk endpoint cron `/api/cron/reminders`.
- `CRON_SECRET`: Token rahasia otorisasi panggilan cron scheduler.
