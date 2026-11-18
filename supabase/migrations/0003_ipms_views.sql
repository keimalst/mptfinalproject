-- =====================================================================
-- CENTRA — Sprint 1 / 0003: kalkulasi IPMS & urgensi tugas real-time.
-- [US-04 REV][BE]. Rumus: docs/sprint-1/ipms-spec.md
--   WP   = bobot tugas selesai / total bobot * 100
--   T    = tugas selesai tepat waktu / tugas selesai ber-deadline * 100 (100 jika belum ada)
--   S    = 100 - bobot tugas terlambat (belum selesai) / total bobot * 100
--   IPMS = 0.5*WP + 0.3*T + 0.2*S
-- Urgensi kritis: belum selesai DAN (lewat tenggat ATAU prioritas high/critical dengan tenggat <= 3 hari).
-- View memakai security_invoker => RLS tabel tasks tetap berlaku.
-- =====================================================================

create view public.v_task_urgency with (security_invoker = true) as
select
  t.id, t.title, t.description, t.division_id, d.name as division_name,
  t.assignee_id, p.full_name as assignee_name,
  t.priority, t.status, t.weight, t.due_date, t.completed_at, t.created_at,
  case
    when t.status = 'done' then 'none'
    when t.due_date is not null and t.due_date < now() then 'critical'
    when t.priority in ('high', 'critical') and t.due_date is not null
         and t.due_date <= now() + interval '3 days' then 'critical'
    when t.due_date is not null and t.due_date <= now() + interval '7 days' then 'warning'
    else 'normal'
  end as urgency,
  (t.status <> 'done' and t.due_date is not null and t.due_date < now()) as is_overdue
from public.tasks t
join public.divisions d on d.id = t.division_id
left join public.profiles p on p.id = t.assignee_id;

create view public.v_division_ipms with (security_invoker = true) as
with agg as (
  select
    d.id as division_id, d.code as division_code, d.name as division_name, d.sort_order,
    count(t.id)::int                                                     as total_tasks,
    (count(t.id) filter (where t.status = 'done'))::int                  as done_tasks,
    (count(t.id) filter (where t.status = 'in_progress'))::int           as in_progress_tasks,
    (count(t.id) filter (where t.status <> 'done' and t.due_date < now()))::int as overdue_tasks,
    (count(t.id) filter (where t.status <> 'done' and (
        t.due_date < now()
        or (t.priority in ('high','critical') and t.due_date <= now() + interval '3 days')
    )))::int                                                             as critical_tasks,
    coalesce(sum(t.weight), 0)::int                                      as total_weight,
    (coalesce(sum(t.weight) filter (where t.status = 'done'), 0))::int   as done_weight,
    (coalesce(sum(t.weight) filter (where t.status <> 'done' and t.due_date < now()), 0))::int as overdue_weight,
    (count(t.id) filter (where t.status = 'done' and t.due_date is not null))::int as done_with_due,
    (count(t.id) filter (where t.status = 'done' and t.due_date is not null
                           and t.completed_at <= t.due_date))::int       as done_on_time
  from public.divisions d
  left join public.tasks t on t.division_id = d.id
  group by grouping sets ((d.id, d.code, d.name, d.sort_order), ())
)
select
  division_id,
  coalesce(division_code, 'ALL') as division_code,
  coalesce(division_name, 'Seluruh Divisi') as division_name,
  sort_order,
  (division_id is null) as is_overall,
  total_tasks, done_tasks, in_progress_tasks, overdue_tasks, critical_tasks,
  case when total_tasks = 0 then 0 else round(100.0 * done_tasks / total_tasks, 1) end as progress_pct,
  case when total_weight = 0 then 0 else round(100.0 * done_weight / total_weight, 1) end as weighted_progress,
  case when done_with_due = 0 then 100 else round(100.0 * done_on_time / done_with_due, 1) end as timeliness,
  case when total_weight = 0 then 100 else round(100.0 - 100.0 * overdue_weight / total_weight, 1) end as schedule_health,
  case when total_tasks = 0 then null else round(
      0.5 * (100.0 * done_weight / nullif(total_weight, 0))
    + 0.3 * (case when done_with_due = 0 then 100 else 100.0 * done_on_time / done_with_due end)
    + 0.2 * (100.0 - 100.0 * overdue_weight / nullif(total_weight, 0)), 1) end as ipms_score
from agg;

revoke all on public.v_task_urgency, public.v_division_ipms from anon;
grant select on public.v_task_urgency, public.v_division_ipms to authenticated;

-- Realtime: dashboard ikut berubah ketika tugas berubah.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
