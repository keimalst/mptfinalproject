# State Machine Persuratan (US-05)

Sumber kebenaran: tabel `document_transitions` + RPC `transition_document`.

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted: pengaju
  Submitted --> Reviewed: documents:review (Ketua)
  Submitted --> RevisionNeeded: review* catatan wajib
  Submitted --> Rejected: review* catatan wajib
  Reviewed --> Approved: documents:approve (Pembina)
  Reviewed --> RevisionNeeded: approve* catatan wajib
  Reviewed --> Rejected: approve* catatan wajib
  RevisionNeeded --> Submitted: pengaju (boleh ganti berkas)
  Approved --> [*]
  Rejected --> [*]
```
Aturan: pengaju tidak boleh mereviu/menyetujui suratnya sendiri; catatan wajib untuk revisi & penolakan;
setiap transisi mencatat aktor, waktu, catatan di `document_status_history` dan membuat notifikasi
(Submitted → pereviu; Reviewed → pembina + pengaju; hasil akhir → pengaju). Status tidak dapat diubah dengan UPDATE langsung.
