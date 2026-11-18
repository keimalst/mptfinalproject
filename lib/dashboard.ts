import "server-only";
import type { AuthContext } from "@/lib/auth/dal";

export type DivisionIpms = {
  division_id: string | null; division_code: string; division_name: string; is_overall: boolean;
  total_tasks: number; done_tasks: number; in_progress_tasks: number; overdue_tasks: number; critical_tasks: number;
  progress_pct: number; weighted_progress: number; timeliness: number; schedule_health: number; ipms_score: number | null;
};

export type UrgencyTask = {
  id: string; title: string; division_id: string; division_name: string; assignee_name: string | null;
  priority: "low" | "medium" | "high" | "critical"; status: "todo" | "in_progress" | "done";
  weight: number; due_date: string | null; urgency: "none" | "normal" | "warning" | "critical"; is_overdue: boolean;
};

export type DashboardData = {
  generated_at: string;
  scope: "all" | "division";
  overall: DivisionIpms | null;
  divisions: DivisionIpms[];
  tasks: UrgencyTask[];
};

export const IPMS_WEIGHTS = { progress: 0.5, timeliness: 0.3, schedule: 0.2 } as const;

export async function getDashboard(
  ctx: AuthContext,
  opts: { urgency?: "all" | "critical"; division?: string | null } = {},
): Promise<{ data: DashboardData } | { error: { code: string; message: string } }> {
  const all = ctx.can("dashboard:view_all");
  const myDivision = ctx.profile.divisionId;
  const divisionFilter = all ? (opts.division ?? null) : myDivision;
  if (!all && !myDivision) {
    return { data: { generated_at: new Date().toISOString(), scope: "division", overall: null, divisions: [], tasks: [] } };
  }

  let ipmsQuery = ctx.supabase.from("v_division_ipms").select("*").order("is_overall", { ascending: false }).order("sort_order");
  if (!all) ipmsQuery = ipmsQuery.eq("division_id", myDivision!);
  const ipms = await ipmsQuery;
  if (ipms.error) return { error: ipms.error };

  let taskQuery = ctx.supabase
    .from("v_task_urgency")
    .select("id,title,division_id,division_name,assignee_name,priority,status,weight,due_date,urgency,is_overdue")
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(100);
  if (divisionFilter) taskQuery = taskQuery.eq("division_id", divisionFilter);
  if (opts.urgency === "critical") taskQuery = taskQuery.eq("urgency", "critical");
  const tasks = await taskQuery;
  if (tasks.error) return { error: tasks.error };

  const rows = ipms.data as DivisionIpms[];
  return {
    data: {
      generated_at: new Date().toISOString(),
      scope: all ? "all" : "division",
      overall: all ? (rows.find((r) => r.is_overall) ?? null) : (rows[0] ?? null),
      divisions: rows.filter((r) => !r.is_overall),
      tasks: tasks.data as UrgencyTask[],
    },
  };
}
