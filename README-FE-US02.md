# CENTRA — Frontend Patch: [US-02][FE] Halaman Pengawasan Pembina & Panel Arahan Strategis

Berisi implementasi UI untuk item **#188 (`[US-02][FE] UI Halaman Pengawasan Pembina & Panel Arahan Strategis (2 SP)`)**:
- `app/(app)/pengawasan/page.tsx` — Server Component halaman `/pengawasan` dengan proteksi `requirePermission("audit:read", "directives:read", "directives:create", "directives:resolve")`.
- `app/(app)/pengawasan/pengawasan-view.tsx` — Client Component interaktif yang mencakup:
  - Ringkasan KPI (Arahan Belum Dibaca, Arahan Ditindaklanjuti, Total Log Aktivitas).
  - Panel Arahan Strategis Pembina (form kirim arahan baru bagi Pembina, serta tombol *Tandai Dibaca* & *Tindak Lanjut Selesai* beserta catatan resolusi bagi Ketua Pelaksana).
  - Tabel Audit Trail Aktivitas & Persetujuan dengan filter modul (`Persuratan`, `Arahan Pembina`, `Hak Akses`).
- `lib/rbac.ts` — Pembaruan aturan route `/pengawasan` pada `ROUTE_RULES` dan item navigasi **Pengawasan** di sidebar (`NAV_ITEMS`).

**Cara pasang:**
1. Ekstrak zip ini ke root proyek `centra` (timpa `lib/rbac.ts` jika diminta).
2. Pastikan zip Backend Sprint 2 (`centra-sprint2-be.zip`) dan migrasi `0005_audit_directives.sql` sudah terpasang.
3. Jalankan `pnpm lint` lalu buka `http://localhost:3000/pengawasan`.
