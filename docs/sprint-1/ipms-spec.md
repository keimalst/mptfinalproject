# Spesifikasi IPMS & Urgensi Kritis (US-04 REV)

Implementasi: `supabase/migrations/0003_ipms_views.sql` (`v_division_ipms`, `v_task_urgency`, `security_invoker` → RLS berlaku).

## Rumus per divisi
| Komponen | Rumus | Bila data kosong |
|---|---|---|
| Progres berbobot **WP** | Σbobot tugas selesai ÷ Σbobot semua tugas × 100 | 0 |
| Ketepatan waktu **T** | tugas selesai ≤ tenggat ÷ tugas selesai ber-tenggat × 100 | 100 |
| Kesehatan jadwal **S** | 100 − Σbobot tugas belum selesai & lewat tenggat ÷ Σbobot × 100 | 100 |
| **IPMS** | 0.5·WP + 0.3·T + 0.2·S | `null` bila divisi belum punya tugas |

`progress_pct` (ditampilkan sebagai "Progres") = tugas selesai ÷ total tugas × 100 (hitungan, tanpa bobot).
Bobot tugas 1–5. Bobot komponen (50/30/20) adalah keputusan analis `[ISI/VALIDASI]`; ubah di view dan `IPMS_WEIGHTS` (`lib/dashboard.ts`).

Pewarnaan UI: ≥ 80 hijau, ≥ 60 kuning, < 60 merah.

## Urgensi tugas (CHG-01)
| Level | Kondisi |
|---|---|
| `critical` | belum selesai **dan** (lewat tenggat **atau** prioritas high/critical dengan tenggat ≤ 3 hari) |
| `warning` | belum selesai, tenggat ≤ 7 hari |
| `normal` | lainnya |
| `none` | sudah selesai |
