-- =====================================================================
-- CENTRA — Sprint 2 / 0005: Audit Log & Arahan Strategis Pembina.
-- Dibuat oleh [US-02][BE] (Start: 2026-11-23).
-- =====================================================================

-- 1. Katalog izin baru Sprint 2 (idempotent)
insert into public.permissions (code, group_name, description) values
  ('audit:read',         'Pengawasan', 'Melihat rekam jejak audit sistem & aktivitas dokumen'),
  ('directives:create',  'Pengawasan', 'Membuat catatan arahan strategis untuk Ketua Pelaksana'),
  ('directives:read',    'Pengawasan', 'Membaca catatan arahan strategis Pembina'),
  ('directives:resolve', 'Pengawasan', 'Menandai arahan strategis sebagai dibaca/ditindaklanjuti'),
  ('workload:read_all',  'Beban Kerja','Melihat distribusi beban kerja & bottleneck seluruh divisi'),
  ('workload:read_division','Beban Kerja','Melihat distribusi beban kerja divisi sendiri'),
  ('tasks:create',       'Tugas',      'Membuat tugas baru lintas/dalam divisi'),
  ('tasks:update_all',   'Tugas',      'Mengubah tugas lintas divisi'),
  ('tasks:update_division','Tugas',    'Mengubah tugas dalam divisi sendiri'),
  ('tasks:update_own',   'Tugas',      'Memperbarui status tugas milik sendiri')
on conflict (code) do nothing;

insert into public.role_permissions (role_code, permission_code) values
  -- Admin
  ('admin',   'audit:read'),
  ('admin',   'directives:read'),
  ('admin',   'workload:read_all'),
  ('admin',   'tasks:create'),
  ('admin',   'tasks:update_all'),
  -- Pembina
  ('pembina', 'audit:read'),
  ('pembina', 'directives:create'),
  ('pembina', 'directives:read'),
  ('pembina', 'workload:read_all'),
  -- Ketua Pelaksana
  ('ketua',   'audit:read'),
  ('ketua',   'directives:read'),
  ('ketua',   'directives:resolve'),
  ('ketua',   'workload:read_all'),
  ('ketua',   'tasks:create'),
  ('ketua',   'tasks:update_all'),
  -- Kepala Divisi
  ('kadiv',   'workload:read_division'),
  ('kadiv',   'tasks:create'),
  ('kadiv',   'tasks:update_division'),
  -- Staff
  ('staff',   'tasks:update_own')
on conflict do nothing;

-- 2. Tabel Audit Logs (append-only)
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('document', 'task', 'role', 'directive')),
  entity_id   text not null,
  action      text not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  division_id uuid references public.divisions (id) on delete set null,
  summary     text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_division_idx on public.audit_logs (division_id);

-- Trigger otomatis mencatat transisi persuratan ke audit_logs
create function public.log_document_history_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.documents;
begin
  select * into v_doc from public.documents where id = new.document_id;
  insert into public.audit_logs (entity_type, entity_id, action, actor_id, division_id, summary, metadata)
  values (
    'document',
    new.document_id::text,
    'status:' || coalesce(new.from_status::text, 'init') || '->' || new.to_status::text,
    new.actor_id,
    v_doc.division_id,
    coalesce(v_doc.title, 'Dokumen') || ' (' || new.to_status::text || ')',
    jsonb_build_object(
      'from_status', new.from_status,
      'to_status', new.to_status,
      'note', new.note,
      'doc_number', v_doc.doc_number
    )
  );
  return new;
end $$;

create trigger document_history_to_audit
  after insert on public.document_status_history
  for each row execute function public.log_document_history_audit();

-- Trigger otomatis mencatat perubahan role/status aktif user ke audit_logs
create function public.log_profile_role_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role_code is distinct from new.role_code or old.is_active is distinct from new.is_active then
    insert into public.audit_logs (entity_type, entity_id, action, actor_id, division_id, summary, metadata)
    values (
      'role',
      new.id::text,
      'profile_updated',
      auth.uid(),
      new.division_id,
      'Perubahan akses ' || coalesce(nullif(new.full_name, ''), new.email, new.id::text),
      jsonb_build_object(
        'old_role', old.role_code,
        'new_role', new.role_code,
        'old_active', old.is_active,
        'new_active', new.is_active
      )
    );
  end if;
  return new;
end $$;

create trigger profiles_to_audit
  after update of role_code, is_active on public.profiles
  for each row execute function public.log_profile_role_audit();

-- 3. Tabel Strategic Directives (Arahan Pembina -> Ketua Pelaksana)
create type public.directive_status as enum ('unread', 'acknowledged', 'resolved');

create table public.strategic_directives (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(btrim(title)) between 3 and 200),
  content         text not null check (char_length(btrim(content)) >= 5),
  priority        public.task_priority not null default 'high',
  status          public.directive_status not null default 'unread',
  created_by      uuid not null references public.profiles (id) on delete restrict,
  acknowledged_by uuid references public.profiles (id) on delete set null,
  acknowledged_at timestamptz,
  resolved_by     uuid references public.profiles (id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index strategic_directives_status_idx on public.strategic_directives (status, created_at desc);

create trigger strategic_directives_updated_at
  before update on public.strategic_directives
  for each row execute function public.set_updated_at();

create function public.strategic_directives_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_by := auth.uid();
  new.status := 'unread';
  return new;
end $$;

create trigger strategic_directives_before_insert
  before insert on public.strategic_directives
  for each row execute function public.strategic_directives_before_insert();

create function public.strategic_directives_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_targets uuid[];
begin
  v_targets := array(
    select u from unnest(public.users_with_permission('directives:resolve')) u where u <> new.created_by
  );
  if array_length(v_targets, 1) > 0 then
    perform public.notify_users(
      v_targets,
      'Arahan Strategis Pembina',
      new.title,
      '/pengawasan/directives'
    );
  end if;

  insert into public.audit_logs (entity_type, entity_id, action, actor_id, summary, metadata)
  values (
    'directive',
    new.id::text,
    'directive_created',
    new.created_by,
    'Arahan baru: ' || new.title,
    jsonb_build_object('priority', new.priority)
  );
  return new;
end $$;

create trigger strategic_directives_after_insert
  after insert on public.strategic_directives
  for each row execute function public.strategic_directives_after_insert();

-- 4. RLS untuk Audit Logs & Strategic Directives
alter table public.audit_logs           enable row level security;
alter table public.strategic_directives enable row level security;

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.has_permission('audit:read'));

create policy directives_select on public.strategic_directives for select to authenticated
  using (public.has_permission('directives:read'));

create policy directives_insert on public.strategic_directives for insert to authenticated
  with check (public.has_permission('directives:create'));

create policy directives_update on public.strategic_directives for update to authenticated
  using (public.has_permission('directives:resolve'))
  with check (public.has_permission('directives:resolve'));

revoke all on public.audit_logs, public.strategic_directives from anon;
revoke update, delete on public.audit_logs from authenticated;
revoke delete on public.strategic_directives from authenticated;
