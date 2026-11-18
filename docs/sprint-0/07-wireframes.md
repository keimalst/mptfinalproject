# Wireframe (low–mid fidelity)

## Login / Manajemen role (Admin)
```
┌ CENTRA ─────────┬──────────────────────────────────────────────┐
│ Dashboard       │ Pengguna & Role            [ Cari nama/email ]│
│ Persuratan      │ ─────────────────────────────────────────────│
│ Pengguna & Role │ Nama / Email │ Role ▾ │ Divisi ▾ │ ☑ │[Simpan]│
│ Matriks Akses   │ …            │ Kadiv  │ Acara    │ ☑ │[Simpan]│
│ Akun Saya       │                                               │
└─────────────────┴──────────────────────────────────────────────┘
(menu yang tidak diizinkan tidak tampil — conditional rendering)
```
## Dashboard IPMS
```
┌ IPMS 78.4 │ Progres 61% │ Selesai 7/13 │ Kritis 4 ┐
├ Progres per divisi ──────────────── ● live ─────────┤
│ Acara   ▓▓▓▒░░░░  25%   kritis 2   IPMS 61.0        │
│ Humas   ▓▓▓▓▓▓░░  50%   kritis 1   IPMS 72.3        │
├ Tugas aktif   [Semua | Urgensi kritis]  ────────────┤
│ ▌Gladi resik · Acara · Prioritas kritis   1 hari lagi│
└─────────────────────────────────────────────────────┘
```
## Persuratan
```
Daftar:  [Semua|Draft|Diajukan|Direview|Perlu revisi|Disetujui|Ditolak]   [Ajukan surat baru]
Detail:  ▬▬ Draft ▬▬ Diajukan ▬▬ Direview ▬▬ Disetujui        (jalur)
         ┌ Informasi + unduh ┐  ┌ Riwayat (timeline + catatan) ┐
         └ Tindakan [Setujui][Minta revisi][Tolak] + catatan ┘
Form:    metadata (perihal, kategori, tujuan) + drag-and-drop PDF/DOCX ≤ 10 MB
```
