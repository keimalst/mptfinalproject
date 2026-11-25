import "server-only";
import type { AuthContext } from "@/lib/auth/dal";

export type AuditEntityType = "document" | "task" | "role" | "directive";

export type AuditLogItem = {
  id: number;
  entity_type: AuditEntityType;
  entity_id: string;
  action: string;
  actor_id: string | null;
  division_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { full_name: string; role_code: string } | null;
  division?: { name: string } | null;
};

export type DirectiveStatus = "unread" | "acknowledged" | "resolved";

export type StrategicDirective = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high" | "critical";
  status: DirectiveStatus;
  created_by: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  author?: { full_name: string } | null;
};

export async function listAuditLogs(
  ctx: AuthContext,
  opts: { entityType?: string | null; divisionId?: string | null; limit?: number } = {},
) {
  let query = ctx.supabase
    .from("audit_logs")
    .select("id,entity_type,entity_id,action,actor_id,division_id,summary,metadata,created_at,actor:profiles!actor_id(full_name,role_code),division:divisions(name)")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(opts.limit ?? 100, 1), 200));

  if (opts.entityType) query = query.eq("entity_type", opts.entityType);
  if (opts.divisionId) query = query.eq("division_id", opts.divisionId);
  return query;
}
