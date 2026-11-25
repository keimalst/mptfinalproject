import "server-only";
import type { AuthContext } from "@/lib/auth/dal";

export type WorkloadStatus = "normal" | "warning" | "bottleneck";

export type DivisionWorkload = {
  division_id: string;
  division_code: string;
  division_name: string;
  sort_order: number;
  active_members: number;
  effective_capacity_weight: number;
  todo_tasks: number;
  in_progress_tasks: number;
  active_tasks: number;
  active_weight: number;
  overdue_tasks: number;
  critical_tasks: number;
  utilization_pct: number;
  workload_status: WorkloadStatus;
  is_bottleneck: boolean;
};

export type MemberWorkload = {
  user_id: string;
  full_name: string;
  email: string | null;
  role_code: string;
  division_id: string | null;
  division_code: string | null;
  division_name: string | null;
  active_tasks: number;
  active_weight: number;
  overdue_tasks: number;
  critical_tasks: number;
  member_capacity_weight: number;
  utilization_pct: number;
  is_overloaded: boolean;
};

export const WORKLOAD_THRESHOLDS = {
  warningUtilizationPct: 65,
  bottleneckUtilizationPct: 85,
  bottleneckCriticalTasks: 3,
  bottleneckOverdueTasks: 2,
  memberCapacityWeight: 10,
} as const;

export async function getWorkloadReport(ctx: AuthContext, divisionFilter?: string | null) {
  const canAll = ctx.can("workload:read_all");
  const targetDivision = canAll ? (divisionFilter ?? null) : ctx.profile.divisionId;

  if (!canAll && !targetDivision) {
    return { data: { divisions: [] as DivisionWorkload[], members: [] as MemberWorkload[], bottlenecks: [] as DivisionWorkload[], thresholds: WORKLOAD_THRESHOLDS } };
  }

  let divQuery = ctx.supabase.from("v_division_workload").select("*").order("sort_order");
  let memQuery = ctx.supabase.from("v_member_workload").select("*").order("utilization_pct", { ascending: false });

  if (targetDivision) {
    divQuery = divQuery.eq("division_id", targetDivision);
    memQuery = memQuery.eq("division_id", targetDivision);
  }

  const [divRes, memRes] = await Promise.all([divQuery, memQuery]);
  const err = divRes.error ?? memRes.error;
  if (err) return { error: err };

  const divisions = (divRes.data ?? []) as DivisionWorkload[];
  const members = (memRes.data ?? []) as MemberWorkload[];
  const bottlenecks = divisions.filter((d) => d.is_bottleneck);

  return { data: { divisions, members, bottlenecks, thresholds: WORKLOAD_THRESHOLDS } };
}
