-- =====================================================================
-- CENTRA — Sprint 1 / 0001: skema inti (roles, permissions, divisions,
-- profiles, tasks). Dibuat oleh [US-01][BE] & [US-04 REV][BE].
-- =====================================================================

create table public.roles (
  code        text primary key check (code ~ '^[a-z_]+$'),
  name        text not null,
  description text,
  rank        smallint not null unique        -- 1 = kewenangan tertinggi
);

create table public.permissions (
  code        text primary key check (code ~ '^[a-z_]+:[a-z_]+$'),  -- resource:action
  group_name  text not null,
  description text not null
);

create table public.role_permissions (
  role_code       text not null references public.roles (code) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  primary key (role_code, permission_code)
);

create table public.divisions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  role_code   text not null default 'staff' references public.roles (code),
  division_id uuid references public.divisions (id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role_code);
create index profiles_division_idx on public.profiles (division_id);

create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.task_status   as enum ('todo', 'in_progress', 'done');

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  division_id  uuid not null references public.divisions (id) on delete restrict,
  assignee_id  uuid references public.profiles (id) on delete set null,
  priority     public.task_priority not null default 'medium',
  status       public.task_status not null default 'todo',
  weight       smallint not null default 1 check (weight between 1 and 5),
  due_date     timestamptz,
  completed_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tasks_division_idx on public.tasks (division_id);
create index tasks_assignee_idx on public.tasks (assignee_id);
create index tasks_status_due_idx on public.tasks (status, due_date);

-- ---------------------------------------------------------------------
-- Trigger utilitas
-- ---------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create function public.tasks_sync_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.tasks_sync_completed_at();

-- Profil otomatis dibuat saat user baru muncul di auth.users.
-- Akun PERTAMA di sistem kosong menjadi Admin (bootstrap); selanjutnya Staff.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role_code)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when exists (select 1 from public.profiles) then 'staff' else 'admin' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
