# Referensi API (Sprint 1)

Semua endpoint butuh sesi login (cookie Supabase). 401 = belum login, 403 = role tidak berwenang.

| Method & path | Izin | Keterangan |
|---|---|---|
| GET `/api/roles` | login | Role + izin + katalog izin. `?include=users` butuh `users:manage_roles` |
| PATCH `/api/roles` | `users:manage_roles` | `{user_id, role_code?, division_id?, is_active?}` |
| PUT `/api/roles/[code]/permissions` | `roles:manage_permissions` | `{permissions: string[]}` (atomik) |
| GET `/api/dashboard/summary` | dashboard:view_* | total, selesai, % progres, IPMS per divisi |
| GET `/api/dashboard/ipms` | dashboard:view_* | rincian IPMS + tugas aktif; `?urgency=critical&division=<uuid>` |
| GET `/api/documents` | documents:* | `?status=&q=` (dibatasi RLS) |
| POST `/api/documents/submit` | `documents:create` | multipart: title, category, recipient, doc_number?, description?, file, intent=submit\|draft |
| PATCH `/api/documents/[id]/status` | akses dokumen | JSON `{status, note?}` atau multipart (+file revisi) |
| GET `/api/documents/[id]/file` | akses dokumen | redirect signed URL 60 dtk |

Kode galat dari database dipetakan: 28000→401, 42501→403, P0002→404, 22023→409 (transisi tak sah), 23514→422 (catatan wajib / guard).
