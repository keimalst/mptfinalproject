import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { getDashboard, IPMS_WEIGHTS } from "@/lib/dashboard";

/** GET /api/dashboard/ipms?urgency=critical&division=<uuid> — rincian IPMS + daftar tugas aktif. */
export async function GET(req: NextRequest) {
  const g = await guard("dashboard:view_all", "dashboard:view_division");
  if ("res" in g) return g.res;
  const sp = req.nextUrl.searchParams;
  const urgency = sp.get("urgency") ?? "all";
  if (urgency !== "all" && urgency !== "critical") return jsonError(400, "Parameter urgency harus 'all' atau 'critical'.");
  const division = sp.get("division");
  if (division && !/^[0-9a-f-]{36}$/i.test(division)) return jsonError(400, "Parameter division tidak valid.");
  const r = await getDashboard(g.ctx, { urgency, division });
  if ("error" in r) return pgError(r.error as never);
  return NextResponse.json({ ...r.data, weights: IPMS_WEIGHTS });
}
