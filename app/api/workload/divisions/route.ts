import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { getWorkloadReport } from "@/lib/workload";

/** GET /api/workload/divisions?division_id= — distribusi beban kerja divisi & anggota + deteksi bottleneck. */
export async function GET(req: NextRequest) {
  const g = await guard("workload:read_all", "workload:read_division");
  if ("res" in g) return g.res;

  const divisionId = req.nextUrl.searchParams.get("division_id");
  if (divisionId && !/^[0-9a-f-]{36}$/i.test(divisionId)) {
    return jsonError(400, "Parameter division_id tidak valid.");
  }

  const res = await getWorkloadReport(g.ctx, divisionId);
  if ("error" in res && res.error) return pgError(res.error as never);
  return NextResponse.json(res.data);
}
