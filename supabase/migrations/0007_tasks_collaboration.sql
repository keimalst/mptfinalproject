-- =====================================================================
-- CENTRA — Sprint 2 / 0007: Tugas Lintas Divisi, Forum Sub-Event, &
-- Cron Auto-Reminder Deadline. Dibuat oleh [US-06][BE] (Start: 2026-11-25).
-- =====================================================================

alter table public.tasks
  add column if not exists sub_event text,
  add column if not exists reminder_sent_at timestamptz;

create index if not exists tasks_sub_event_idx on public.tasks (sub_event);

-- 1. Policy INSERT & UPDATE untuk tabel public.tasks (melengkapi 0002_rbac_rls.sql)
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.has_permission('tasks:create')
    and (
      public.has_permission('tasks:update_all')
      or division_id = public.current_division_id()
    )
  );

create policy tasks_update on public.tasks for update to authenticated
  using (
    public.has_permission('tasks:update_all')
    or (public.has_permission('tasks:update_division') and division_id = public.current_division_id())
    or (public.has_permission('tasks:update_own') and assignee_id = auth.uid())
  )
  with check (
    public.has_permission('tasks:update_all')
    or (public.has_permission('tasks:update_division') and division_id = public.current_division_id())
    or (public.has_permission('tasks:update_own') and assignee_id = auth.uid())
  );

create policy tasks_delete on public.tasks for delete to authenticated
  using (
    public.has_permission('tasks:update_all')
    or (public.has_permission('tasks:update_division') and division_id = public.current_division_id())
  );

-- Trigger notifikasi otomatis saat tugas baru ditetapkan ke assignee
create function public.tasks_notify_on_assign() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or old.assignee_id is distinct from new.assignee_id) then
    if new.assignee_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify_users(
        array[new.assignee_id],
        'Tugas Baru Ditetapkan',
        new.title,
        '/tasks'
      );
    end if;
  end if;
  return new;
end $$;

create trigger tasks_notify_assign
  after insert or update of assignee_id on public.tasks
  for each row execute function public.tasks_notify_on_assign();

-- 2. Forum Diskusi per Tugas / Sub-Event
create table public.task_comments (
  id         bigint generated always as identity primary key,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at asc);

create function public.task_comments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid();
  return new;
end $$;

create trigger task_comments_before_insert
  before insert on public.task_comments
  for each row execute function public.task_comments_before_insert();

alter table public.task_comments enable row level security;

-- Hanya pengguna yang bisa melihat tugas tersebut yang bisa membaca/menulis komentar di dalamnya
create policy task_comments_select on public.task_comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));

create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (
    public.is_active_user()
    and exists (select 1 from public.tasks t where t.id = task_id)
  );

revoke all on public.task_comments from anon;
revoke update, delete on public.task_comments from authenticated;

-- 3. RPC Cron Auto-Reminder H-24 Jam Deadline
create function public.send_due_task_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select id, title, assignee_id
    from public.tasks
    where status <> 'done'
      and assignee_id is not null
      and due_date is not null
      and due_date > now()
      and due_date <= now() + interval '24 hours'
      and reminder_sent_at is null
    for update skip locked
  loop
    perform public.notify_users(
      array[r.assignee_id],
      'Pengingat Tenggat Tugas (< 24 Jam)',
      r.title,
      '/tasks'
    );
    update public.tasks set reminder_sent_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

revoke all on function public.send_due_task_reminders() from public, anon, authenticated;
grant execute on function public.send_due_task_reminders() to service_role;
