-- =====================================================================
-- CENTRA — Sprint 2 / 0006: Agregasi Beban Kerja & Deteksi Bottleneck.
-- Dibuat oleh [US-03][BE] (Start: 2026-11-24).
-- Threshold CHG-02:
--   - default_capacity_weight per anggota aktif = 10 poin bobot tugas aktif
--   - utilization_pct = active_weight / max(capacity_weight, 1) * 100
--   - status: 'bottleneck' (>= 85% atau critical_tasks >= 3 atau overdue_tasks >= 2)
--             'warning'    (>= 65% atau critical_tasks >= 1)
--             'normal'     (< 65%)
-- =====================================================================

alter table public.divisions
  add column if not exists max_active_weight int not null default 15 check (max_active_weight > 0);

create view public.v_member_workload with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.email,
  p.role_code,
  p.division_id,
  d.code as division_code,
  d.name as division_name,
  count(t.id) filter (where t.status <> 'done')::int as active_tasks,
  coalesce(sum(t.weight) filter (where t.status <> 'done'), 0)::int as active_weight,
  count(t.id) filter (where t.status <> 'done' and t.due_date is not null and t.due_date < now())::int as overdue_tasks,
  count(t.id) filter (where t.status <> 'done' and (
    (t.due_date is not null and t.due_date < now())
    or (t.priority in ('high', 'critical') and t.due_date is not null and t.due_date <= now() + interval '3 days')
  ))::int as critical_tasks,
  10 as member_capacity_weight,
  round(100.0 * coalesce(sum(t.weight) filter (where t.status <> 'done'), 0) / 10.0, 1) as utilization_pct,
  (coalesce(sum(t.weight) filter (where t.status <> 'done'), 0) >= 9) as is_overloaded
from public.profiles p
left join public.divisions d on d.id = p.division_id
left join public.tasks t on t.assignee_id = p.id
where p.is_active = true
group by p.id, p.full_name, p.email, p.role_code, p.division_id, d.code, d.name;

create view public.v_division_workload with (security_invoker = true) as
with member_counts as (
  select division_id, count(*)::int as active_members
  from public.profiles
  where is_active = true and division_id is not null
  group by division_id
),
task_agg as (
  select
    d.id as division_id,
    d.code as division_code,
    d.name as division_name,
    d.sort_order,
    d.max_active_weight,
    coalesce(mc.active_members, 0) as active_members,
    greatest(d.max_active_weight, coalesce(mc.active_members, 0) * 10) as effective_capacity_weight,
    count(t.id) filter (where t.status = 'todo')::int as todo_tasks,
    count(t.id) filter (where t.status = 'in_progress')::int as in_progress_tasks,
    count(t.id) filter (where t.status <> 'done')::int as active_tasks,
    coalesce(sum(t.weight) filter (where t.status <> 'done'), 0)::int as active_weight,
    count(t.id) filter (where t.status <> 'done' and t.due_date is not null and t.due_date < now())::int as overdue_tasks,
    count(t.id) filter (where t.status <> 'done' and (
      (t.due_date is not null and t.due_date < now())
      or (t.priority in ('high', 'critical') and t.due_date is not null and t.due_date <= now() + interval '3 days')
    ))::int as critical_tasks
  from public.divisions d
  left join member_counts mc on mc.division_id = d.id
  left join public.tasks t on t.division_id = d.id
  group by d.id, d.code, d.name, d.sort_order, d.max_active_weight, mc.active_members
)
select
  division_id,
  division_code,
  division_name,
  sort_order,
  active_members,
  effective_capacity_weight,
  todo_tasks,
  in_progress_tasks,
  active_tasks,
  active_weight,
  overdue_tasks,
  critical_tasks,
  round(100.0 * active_weight / greatest(effective_capacity_weight, 1), 1) as utilization_pct,
  case
    when (100.0 * active_weight / greatest(effective_capacity_weight, 1)) >= 85.0
         or critical_tasks >= 3
         or overdue_tasks >= 2 then 'bottleneck'
    when (100.0 * active_weight / greatest(effective_capacity_weight, 1)) >= 65.0
         or critical_tasks >= 1 then 'warning'
    else 'normal'
  end as workload_status,
  (
    (100.0 * active_weight / greatest(effective_capacity_weight, 1)) >= 85.0
    or critical_tasks >= 3
    or overdue_tasks >= 2
  ) as is_bottleneck
from task_agg;
