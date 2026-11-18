-- =====================================================================
-- CENTRA — Sprint 1 / 0002: data awal 5 role + izin, fungsi helper RBAC,
-- dan Row Level Security. [US-01][BE]
-- =====================================================================

-- ---------------------------------------------------------------------
-- Seeding 5 role & katalog izin (idempotent)
-- ---------------------------------------------------------------------
insert into public.roles (code, name, description, rank) values
  ('admin',   'Admin Sistem',        'Mengelola pengguna, role, dan hak akses sistem.', 1),
  ('pembina', 'Pembina Organisasi',  'Pengawas kelembagaan; menyetujui dokumen akhir.', 2),
  ('ketua',   'Ketua Pelaksana',     'Pemimpin kepanitiaan; mereviu dokumen lintas divisi.', 3),
  ('kadiv',   'Kepala Divisi',       'Memimpin satu divisi; mengajukan persuratan.', 4),
  ('staff',   'Staff Panitia',       'Anggota divisi; mengerjakan tugas harian.', 5)
on conflict (code) do nothing;

insert into public.permissions (code, group_name, description) values
  ('users:read',            'Pengguna',   'Melihat daftar pengguna & role'),
  ('users:manage_roles',    'Pengguna',   'Mengubah role, divisi, dan status aktif pengguna'),
  ('roles:manage_permissions','Hak akses','Mengubah izin yang dimiliki tiap role'),
  ('divisions:read',        'Divisi',     'Melihat daftar divisi'),
  ('divisions:manage',      'Divisi',     'Menambah/mengubah/menghapus divisi'),
  ('dashboard:view_all',    'Dashboard',  'Melihat dashboard progres & IPMS seluruh divisi'),
  ('dashboard:view_division','Dashboard', 'Melihat dashboard progres & IPMS divisi sendiri'),
  ('tasks:read_all',        'Tugas',      'Melihat seluruh tugas lintas divisi'),
  ('tasks:read_division',   'Tugas',      'Melihat tugas pada divisi sendiri'),
  ('tasks:read_own',        'Tugas',      'Melihat tugas yang ditugaskan kepada diri sendiri'),
  ('documents:create',      'Persuratan', 'Mengajukan dokumen persuratan'),
  ('documents:read_all',    'Persuratan', 'Melihat seluruh dokumen persuratan'),
  ('documents:read_division','Persuratan','Melihat dokumen persuratan divisi sendiri'),
  ('documents:review',      'Persuratan', 'Mereviu dokumen (Submitted -> Reviewed/Revision/Rejected)'),
  ('documents:approve',     'Persuratan', 'Menyetujui dokumen (Reviewed -> Approved/Revision/Rejected)')
on conflict (code) do nothing;

insert into public.role_permissions (role_code, permission_code) values
  -- Admin: tata kelola akses + pengawasan baca-saja
  ('admin','users:read'),('admin','users:manage_roles'),('admin','roles:manage_permissions'),
  ('admin','divisions:read'),('admin','divisions:manage'),
  ('admin','dashboard:view_all'),('admin','tasks:read_all'),('admin','documents:read_all'),
  -- Pembina
  ('pembina','users:read'),('pembina','divisions:read'),
  ('pembina','dashboard:view_all'),('pembina','tasks:read_all'),
  ('pembina','documents:read_all'),('pembina','documents:approve'),
  -- Ketua Pelaksana
  ('ketua','users:read'),('ketua','divisions:read'),
  ('ketua','dashboard:view_all'),('ketua','tasks:read_all'),
  ('ketua','documents:create'),('ketua','documents:read_all'),('ketua','documents:review'),
  -- Kepala Divisi
  ('kadiv','divisions:read'),
  ('kadiv','dashboard:view_division'),('kadiv','tasks:read_division'),
  ('kadiv','documents:create'),('kadiv','documents:read_division'),
  -- Staff
  ('staff','divisions:read'),('staff','tasks:read_own')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Fungsi helper (SECURITY DEFINER agar tidak rekursif terhadap RLS)
-- ---------------------------------------------------------------------
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
$$;

create function public.current_role_code() returns text
language sql stable security definer set search_path = public as $$
  select p.role_code from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.current_division_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.division_id from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function public.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_code = p.role_code
    where p.id = auth.uid() and p.is_active and rp.permission_code = p_permission
  )
$$;

revoke all on function public.is_active_user(), public.current_role_code(),
  public.current_division_id(), public.has_permission(text) from public, anon;
grant execute on function public.is_active_user(), public.current_role_code(),
  public.current_division_id(), public.has_permission(text) to authenticated;

-- ---------------------------------------------------------------------
-- Guard anti-lockout
-- ---------------------------------------------------------------------
create function public.guard_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role_code = 'admin' and old.is_active
     and (new.role_code <> 'admin' or not new.is_active)
     and not exists (select 1 from public.profiles p
                     where p.role_code = 'admin' and p.is_active and p.id <> old.id) then
    raise exception 'Tidak dapat menonaktifkan atau menurunkan Admin terakhir.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger profiles_guard_last_admin before update of role_code, is_active on public.profiles
  for each row execute function public.guard_last_admin();

create function public.guard_admin_permissions() returns trigger
language plpgsql as $$
begin
  if old.role_code = 'admin'
     and old.permission_code in ('users:manage_roles', 'roles:manage_permissions') then
    raise exception 'Izin % pada role admin tidak boleh dicabut.', old.permission_code using errcode = '23514';
  end if;
  return old;
end $$;

create trigger role_permissions_guard_admin before delete on public.role_permissions
  for each row execute function public.guard_admin_permissions();

-- Ganti seluruh izin sebuah role secara atomik (diff-based, SECURITY INVOKER -> RLS berlaku)
create function public.set_role_permissions(p_role_code text, p_permissions text[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.role_permissions
   where role_code = p_role_code and not (permission_code = any (p_permissions));
  insert into public.role_permissions (role_code, permission_code)
  select p_role_code, unnest(p_permissions)
  on conflict do nothing;
end $$;
revoke all on function public.set_role_permissions(text, text[]) from public, anon;
grant execute on function public.set_role_permissions(text, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.divisions        enable row level security;
alter table public.profiles         enable row level security;
alter table public.tasks            enable row level security;

create policy roles_select on public.roles for select to authenticated
  using (public.is_active_user());
create policy permissions_select on public.permissions for select to authenticated
  using (public.is_active_user());

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.is_active_user());
create policy role_permissions_insert on public.role_permissions for insert to authenticated
  with check (public.has_permission('roles:manage_permissions'));
create policy role_permissions_delete on public.role_permissions for delete to authenticated
  using (public.has_permission('roles:manage_permissions'));

create policy divisions_select on public.divisions for select to authenticated
  using (public.is_active_user());
create policy divisions_insert on public.divisions for insert to authenticated
  with check (public.has_permission('divisions:manage'));
create policy divisions_update on public.divisions for update to authenticated
  using (public.has_permission('divisions:manage')) with check (public.has_permission('divisions:manage'));
create policy divisions_delete on public.divisions for delete to authenticated
  using (public.has_permission('divisions:manage'));

-- Profil: setiap akun boleh membaca profilnya sendiri (agar akun nonaktif terdeteksi),
-- pengguna aktif boleh membaca direktori nama/role; hanya pemegang users:manage_roles yang boleh mengubah.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active_user());
create policy profiles_update on public.profiles for update to authenticated
  using (public.has_permission('users:manage_roles'))
  with check (public.has_permission('users:manage_roles'));

-- Tugas: akses berlapis (semua / divisi sendiri / milik sendiri). Penulisan menyusul di Sprint 2 (US-06).
create policy tasks_select on public.tasks for select to authenticated
  using (
    public.has_permission('tasks:read_all')
    or (public.has_permission('tasks:read_division') and division_id = public.current_division_id())
    or (public.has_permission('tasks:read_own') and assignee_id = auth.uid())
  );

-- Cabut akses anon sepenuhnya
revoke all on public.roles, public.permissions, public.role_permissions,
  public.divisions, public.profiles, public.tasks from anon;
