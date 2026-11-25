import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { listAuditLogs } from "@/lib/audit";

const ENTITIES = ["document", "task", "role", "directive"];

/** GET /api/audit-logs?entity_type=&division_id=&limit= — log aktivitas pengawasan (Pembina/Ketua/Admin). */
export async function GET(req: NextRequest) {
  const g = await guard("audit:read");
  if ("res" in g) return g.res;

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entity_type");
  if (entityType && !ENTITIES.includes(entityType)) {
    return jsonError(400, "Parameter entity_type tidak valid.");
  }
  const divisionId = sp.get("division_id");
  if (divisionId && !/^[0-9a-f-]{36}$/i.test(divisionId)) {
    return jsonError(400, "Parameter division_id tidak valid.");
  }
  const limitRaw = sp.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  if (Number.isNaN(limit) || limit < 1 || limit > 200) {
    return jsonError(400, "Parameter limit harus antara 1 dan 200.");
  }

  const { data, error } = await listAuditLogs(g.ctx, { entityType, divisionId, limit });
  if (error) return pgError(error);
  return NextResponse.json({ audit_logs: data });
}
