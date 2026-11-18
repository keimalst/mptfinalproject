# Product Vision Board — CENTRA

**Visi.** CENTRA menjadi pusat kendali tata kelola kepanitiaan kampus: setiap orang tahu wewenangnya, setiap divisi terukur progresnya,
dan setiap surat birokrasi terlacak dari draft hingga persetujuan.

| Kotak | Isi |
|---|---|
| **Target pengguna** | Panitia event kampus (Admin sistem, Pembina, Ketua Pelaksana, Kepala Divisi, Staff) dan birokrasi pendamping (Direktorat Pendidikan ITS) |
| **Kebutuhan / masalah** | Koordinasi lintas divisi tersebar di chat; progres tidak terukur objektif; surat birokrasi hilang/tertahan tanpa jejak; beban kerja timpang tidak terlihat |
| **Produk** | Aplikasi web (Next.js + Supabase): RBAC 5 role, dashboard progres & skor IPMS, alur persuratan ber-state-machine, (Sprint 2) pengawasan Pembina, bottleneck alert, manajemen tugas |
| **Nilai bisnis / dampak** | Keputusan lebih cepat (dashboard < 1 dtk), surat tidak "menggantung", akuntabilitas jejak audit, adopsi tinggi karena UI ringkas |
| **Metrik keberhasilan** | 100% pengguna terpetakan ke 1 role; 0 akses lintas-divisi tak sah (diuji RLS); median waktu persetujuan surat turun; ≥ 80% Kadiv memakai persuratan digital saat UAT `[ISI/VALIDASI target]` |
| **Di luar ruang lingkup (saat ini)** | Pembayaran/anggaran, integrasi e-mail/WhatsApp, aplikasi mobile native |
