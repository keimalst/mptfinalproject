# Setup Repository, GitHub Projects & Scrum Cadence

## Repository
- `pnpm install` → salin `.env.example` ke `.env.local` → `pnpm dev`. Build lokal: `pnpm build` (lulus tanpa error).
- Branching: `main` (rilis) ← `develop` ← `feat/<US>-<peran>-<ringkas>`. PR wajib 1 reviewer; judul PR mengikuti judul issue.

## GitHub Projects v2 (buat manual di GitHub — tidak bisa dibuat dari kode)
Views: **Backlog** (table, group by Sprint), **Active Sprint Board** (board: Backlog/Ready/In progress/In review/Done),
**Roadmap** (timeline dari field Iteration), **Team Workload** (table, group by Assignee, sum SP).
Fields: `Sprint` (Iteration, 2 minggu), `SP` (number), `MoSCoW` (single select), `Role` (single select), `US` (text).
Iterasi: Sprint 0 22 Okt–05 Nov · Sprint 1 06–20 Nov · Sprint 2 21 Nov–05 Des 2026.
Labels: `must` `should` `could` `US-01…US-06` `BE` `FE` `Analyst` `PO` `Scrum` `risk`.

## Scrum events
| Event | Jadwal usulan `[ISI/VALIDASI]` | Durasi |
|---|---|---|
| Sprint Planning | Hari pertama sprint | 1–2 jam |
| Daily Standup | Tiap hari kerja | 15 menit |
| Sprint Review | Hari terakhir sprint | 1 jam |
| Retrospective | Setelah Review | 45 menit |

## Definition of Done (7 kriteria)
Lihat `sprint-1/dod-checklist.md`.
