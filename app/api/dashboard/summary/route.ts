import { NextResponse } from "next/server";
import { guard, pgError } from "@/lib/api";
import { getDashboard } from "@/lib/dashboard";

/** GET /api/dashboard/summary — total tugas, selesai, % progres, skor IPMS per divisi. */
export async function GET() {
  const g = await guard("dashboard:view_all", "dashboard:view_division");
  if ("res" in g) return g.res;
  const r = await getDashboard(g.ctx);
  if ("error" in r) return pgError(r.error as never);
  const slim = (d: (typeof r.data.divisions)[number]) => ({
    division_id: d.division_id, division_name: d.division_name, total_tasks: d.total_tasks,
    done_tasks: d.done_tasks, progress_pct: d.progress_pct, ipms_score: d.ipms_score,
  });
  return NextResponse.json({
    generated_at: r.data.generated_at, scope: r.data.scope,
    overall: r.data.overall && slim(r.data.overall), divisions: r.data.divisions.map(slim),
  });
}
