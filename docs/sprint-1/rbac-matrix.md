# Matriks Otorisasi 5 Role (US-01)

Sumber kebenaran: tabel `role_permissions` (seed di `supabase/migrations/0002_rbac_rls.sql`), dapat diubah Admin lewat **Matriks Hak Akses**.

| Izin | Admin | Pembina | Ketua | Kadiv | Staff |
|---|:-:|:-:|:-:|:-:|:-:|
| users:read | ✔ | ✔ | ✔ | | |
| users:manage_roles | ✔ | | | | |
| roles:manage_permissions | ✔ | | | | |
| divisions:read | ✔ | ✔ | ✔ | ✔ | ✔ |
| divisions:manage | ✔ | | | | |
| dashboard:view_all | ✔ | ✔ | ✔ | | |
| dashboard:view_division | | | | ✔ | |
| tasks:read_all | ✔ | ✔ | ✔ | | |
| tasks:read_division | | | | ✔ | |
| tasks:read_own | | | | | ✔ |
| documents:create | | | ✔ | ✔ | |
| documents:read_all | ✔ | ✔ | ✔ | | |
| documents:read_division | | | | ✔ | |
| documents:review | | | ✔ | | |
| documents:approve | | ✔ | | | |

## Edge case eskalasi (terdokumentasi & diuji)
- Pengguna tidak dapat mengubah role sendiri (policy UPDATE hanya `users:manage_roles`).
- Admin terakhir tidak dapat diturunkan/dinonaktifkan (trigger `guard_last_admin`).
- Izin `users:manage_roles` & `roles:manage_permissions` pada role admin tidak dapat dicabut (trigger `guard_admin_permissions`).
- Pengaju tidak boleh mereviu/menyetujui suratnya sendiri (pemisahan tugas di `transition_document`).
- Akun nonaktif: semua helper RLS mengembalikan false; proxy memaksa sign-out.
- Kadiv/Staff tanpa divisi tidak melihat data apa pun (UI memberi peringatan).
- Akun pertama di sistem kosong otomatis Admin → **matikan public sign-up** di Supabase Auth setelah bootstrap.
- Profil terbaca oleh semua pengguna aktif (nama/email/role) agar nama pengaju/aktor dapat ditampilkan — keputusan sadar, bukan kelalaian.
