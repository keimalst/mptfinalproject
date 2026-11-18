-- =====================================================================
-- CENTRA — Sprint 1 / 0004: persuratan birokrasi. [US-05][BE]
-- State machine, riwayat, notifikasi, Storage bucket privat + policy.
-- =====================================================================

create type public.document_status as enum
  ('draft', 'submitted', 'reviewed', 'revision_needed', 'approved', 'rejected');

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 3 and 200),
  doc_number   text,
  category     text not null check (category in ('surat_izin','surat_tugas','proposal','lpj','undangan','lainnya')),
  recipient    text not null check (char_length(btrim(recipient)) >= 2),
  description  text,
  division_id  uuid references public.divisions (id) on delete set null,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  status       public.document_status not null default 'draft',
  file_path    text not null,
  file_name    text not null,
  file_size    bigint not null check (file_size > 0 and file_size <= 10485760),
  file_mime    text not null check (file_mime in (
                 'application/pdf',
                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  revision_no  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index documents_status_idx on public.documents (status);
create index documents_division_idx on public.documents (division_id);
create index documents_submitter_idx on public.documents (submitted_by);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_status_history (
  id          bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  from_status public.document_status,
  to_status   public.document_status not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index document_history_doc_idx on public.document_status_history (document_id, created_at);

-- Tabel aturan transisi (satu-satunya sumber kebenaran state machine)
create table public.document_transitions (
  from_status     public.document_status not null,
  to_status       public.document_status not null,
  actor_kind      text not null check (actor_kind in ('submitter', 'permission')),
  permission_code text references public.permissions (code),
  note_required   boolean not null default false,
  primary key (from_status, to_status),
  check ((actor_kind = 'permission') = (permission_code is not null))
);
insert into public.document_transitions values
  ('draft',           'submitted',       'submitter',  null,                false),
  ('revision_needed', 'submitted',       'submitter',  null,                false),
  ('submitted',       'reviewed',        'permission', 'documents:review',  false),
  ('submitted',       'revision_needed', 'permission', 'documents:review',  true),
  ('submitted',       'rejected',        'permission', 'documents:review',  true),
  ('reviewed',        'approved',        'permission', 'documents:approve', false),
  ('reviewed',        'revision_needed', 'permission', 'documents:approve', true),
  ('reviewed',        'rejected',        'permission', 'documents:approve', true);

create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Helper akses dokumen
-- ---------------------------------------------------------------------
create function public.can_access_document(p_division uuid, p_submitter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user() and (
    p_submitter = auth.uid()
    or public.has_permission('documents:read_all')
    or (public.has_permission('documents:read_division')
        and p_division is not null and p_division = public.current_division_id())
  )
$$;
revoke all on function public.can_access_document(uuid, uuid) from public, anon;
grant execute on function public.can_access_document(uuid, uuid) to authenticated;

-- Pengisi otomatis & penguncian saat INSERT
create function public.documents_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.submitted_by := auth.uid();
  new.status := 'draft';
  new.revision_no := 0;
  new.division_id := coalesce(public.current_division_id(), new.division_id);
  return new;
end $$;
create trigger documents_before_insert before insert on public.documents
  for each row execute function public.documents_before_insert();

create function public.documents_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.document_status_history (document_id, from_status, to_status, actor_id, note)
  values (new.id, null, 'draft', new.submitted_by, 'Dokumen dibuat');
  return new;
end $$;
create trigger documents_after_insert after insert on public.documents
  for each row execute function public.documents_after_insert();

-- Notifikasi internal (tidak dapat dipanggil klien)
create function public.notify_users(p_users uuid[], p_title text, p_body text, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select u, p_title, p_body, p_link from unnest(p_users) as u
$$;
revoke all on function public.notify_users(uuid[], text, text, text) from public, anon, authenticated;

create function public.users_with_permission(p_permission text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(p.id), '{}')
  from public.profiles p
  join public.role_permissions rp on rp.role_code = p.role_code
  where p.is_active and rp.permission_code = p_permission
$$;
revoke all on function public.users_with_permission(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Transisi status (RPC). Seluruh validasi state machine ada di sini.
-- ---------------------------------------------------------------------
create function public.transition_document(
  p_document_id uuid, p_to_status public.document_status, p_note text default null,
  p_file_path text default null, p_file_name text default null,
  p_file_size bigint default null, p_file_mime text default null
) returns public.documents
language plpgsql security definer set search_path = public as $$
declare
  d   public.documents;
  tr  public.document_transitions;
  uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_link text;
  v_targets uuid[];
begin
  if uid is null or not public.is_active_user() then
    raise exception 'Tidak terautentikasi.' using errcode = '28000';
  end if;

  select * into d from public.documents where id = p_document_id for update;
  if not found or not public.can_access_document(d.division_id, d.submitted_by) then
    raise exception 'Dokumen tidak ditemukan.' using errcode = 'P0002';
  end if;

  select * into tr from public.document_transitions
   where from_status = d.status and to_status = p_to_status;
  if not found then
    raise exception 'Transisi status % -> % tidak diizinkan.', d.status, p_to_status using errcode = '22023';
  end if;

  if tr.actor_kind = 'submitter' then
    if d.submitted_by <> uid then
      raise exception 'Hanya pengaju yang dapat melakukan transisi ini.' using errcode = '42501';
    end if;
  else
    if not public.has_permission(tr.permission_code) or d.submitted_by = uid then
      raise exception 'Anda tidak berwenang melakukan transisi ini.' using errcode = '42501';
    end if;
  end if;

  if tr.note_required and v_note is null then
    raise exception 'Catatan wajib diisi untuk transisi ini.' using errcode = '23514';
  end if;
  if p_file_path is not null and tr.actor_kind <> 'submitter' then
    raise exception 'Berkas hanya dapat diganti oleh pengaju.' using errcode = '42501';
  end if;

  update public.documents set
    status      = p_to_status,
    file_path   = coalesce(p_file_path, file_path),
    file_name   = coalesce(p_file_name, file_name),
    file_size   = coalesce(p_file_size, file_size),
    file_mime   = coalesce(p_file_mime, file_mime),
    revision_no = revision_no + case when p_file_path is not null then 1 else 0 end
  where id = d.id returning * into d;

  insert into public.document_status_history (document_id, from_status, to_status, actor_id, note)
  values (d.id, tr.from_status, p_to_status, uid, v_note);

  v_link := '/documents/' || d.id;
  if p_to_status = 'submitted' then
    v_targets := array(select u from unnest(public.users_with_permission('documents:review')) u where u <> uid);
    perform public.notify_users(v_targets, 'Surat menunggu review', d.title, v_link);
  elsif p_to_status = 'reviewed' then
    v_targets := array(select u from unnest(public.users_with_permission('documents:approve')) u where u <> uid);
    perform public.notify_users(v_targets, 'Surat menunggu persetujuan', d.title, v_link);
    perform public.notify_users(array[d.submitted_by], 'Surat Anda telah direview', d.title, v_link);
  else
    perform public.notify_users(array[d.submitted_by],
      case p_to_status when 'approved' then 'Surat disetujui'
                       when 'rejected' then 'Surat ditolak'
                       else 'Surat perlu revisi' end,
      coalesce(v_note, d.title), v_link);
  end if;
  return d;
end $$;

-- Transisi yang boleh dilakukan pemanggil pada sebuah dokumen (untuk UI)
create function public.document_available_transitions(p_document_id uuid)
returns table (to_status public.document_status, note_required boolean)
language sql stable security definer set search_path = public as $$
  select t.to_status, t.note_required
  from public.documents d
  join public.document_transitions t on t.from_status = d.status
  where d.id = p_document_id
    and public.can_access_document(d.division_id, d.submitted_by)
    and (
      (t.actor_kind = 'submitter' and d.submitted_by = auth.uid())
      or (t.actor_kind = 'permission' and d.submitted_by <> auth.uid() and public.has_permission(t.permission_code))
    )
$$;

revoke all on function public.transition_document(uuid, public.document_status, text, text, text, bigint, text),
  public.document_available_transitions(uuid) from public, anon;
grant execute on function public.transition_document(uuid, public.document_status, text, text, text, bigint, text),
  public.document_available_transitions(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.documents               enable row level security;
alter table public.document_status_history enable row level security;
alter table public.document_transitions    enable row level security;
alter table public.notifications           enable row level security;

create policy documents_select on public.documents for select to authenticated
  using (public.can_access_document(division_id, submitted_by));
create policy documents_insert on public.documents for insert to authenticated
  with check (public.has_permission('documents:create'));
-- Tidak ada policy UPDATE/DELETE: perubahan status hanya lewat transition_document().

create policy history_select on public.document_status_history for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id));

create policy transitions_select on public.document_transitions for select to authenticated
  using (public.is_active_user());

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.documents, public.document_status_history,
  public.document_transitions, public.notifications from anon;
revoke update, delete on public.documents, public.document_status_history from authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket privat, 10 MB, hanya PDF/DOCX
-- Konvensi path: {user_id}/{document_id}/{timestamp}-{nama_aman}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy documents_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.has_permission('documents:create')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy documents_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text
         or exists (select 1 from public.documents d where d.file_path = storage.objects.name))
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.documents;
    alter publication supabase_realtime add table public.document_status_history;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
