# ERD CENTRA

Status: ✅ = sudah dimigrasi di Sprint 1 · 🕓 = direncanakan Sprint 2.

```mermaid
erDiagram
  auth_users ||--|| profiles : "1:1 (id)"
  roles ||--o{ profiles : "role_code"
  roles ||--o{ role_permissions : ""
  permissions ||--o{ role_permissions : ""
  divisions ||--o{ profiles : "division_id"
  divisions ||--o{ tasks : "division_id"
  profiles ||--o{ tasks : "assignee_id"
  profiles ||--o{ documents : "submitted_by"
  divisions ||--o{ documents : "division_id"
  documents ||--o{ document_status_history : ""
  profiles ||--o{ document_status_history : "actor_id"
  document_transitions }o--o{ documents : "aturan status"
  profiles ||--o{ notifications : "user_id"
  profiles ||--o{ audit_logs : "actor (S2)"
  profiles ||--o{ strategic_directives : "pembina→ketua (S2)"
  tasks ||--o{ task_comments : "(S2)"
  profiles { uuid id PK  text full_name  text role_code FK  uuid division_id FK  bool is_active }
  roles { text code PK  text name  smallint rank }
  permissions { text code PK  text group_name }
  role_permissions { text role_code FK  text permission_code FK }
  divisions { uuid id PK  text code  text name }
  tasks { uuid id PK  uuid division_id FK  uuid assignee_id FK  enum priority  enum status  smallint weight  timestamptz due_date  timestamptz completed_at }
  documents { uuid id PK  text title  enum status  uuid submitted_by FK  uuid division_id FK  text file_path  int revision_no }
  document_status_history { bigint id PK  uuid document_id FK  enum from_status  enum to_status  uuid actor_id FK  text note }
  document_transitions { enum from_status  enum to_status  text actor_kind  text permission_code }
  notifications { bigint id PK  uuid user_id FK  text title  timestamptz read_at }
```

## Kebijakan RLS ringkas
| Tabel | SELECT | Tulis |
|---|---|---|
| roles, permissions, role_permissions | pengguna aktif | `roles:manage_permissions` (hanya role_permissions) |
| divisions | pengguna aktif | `divisions:manage` |
| profiles | diri sendiri / pengguna aktif | `users:manage_roles` |
| tasks | `tasks:read_all` / `read_division` + divisi sama / `read_own` + assignee | Sprint 2 |
| documents | pengaju · `read_all` · `read_division` + divisi sama | INSERT `documents:create`; status hanya via RPC |
| document_status_history | mengikuti visibilitas dokumen | hanya trigger/RPC |
| notifications | pemilik | pemilik (read_at) |
| storage `documents` | pengaju atau dokumen yang terlihat | `documents:create` ke folder `{uid}/…` |
