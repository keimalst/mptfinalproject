import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";

/** GET /api/documents?status=&q= — daftar dokumen yang boleh dilihat (dibatasi RLS). */
export async function GET(req: NextRequest) {
  const g = await guard("documents:read_all", "documents:read_division", "documents:create");
  if ("res" in g) return g.res;
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim();
  let query = g.ctx.supabase
    .from("documents")
    .select("id,title,doc_number,category,recipient,status,file_name,revision_no,created_at,updated_at,submitter:profiles!submitted_by(full_name),division:divisions(name)")
    .order("updated_at", { ascending: false }).limit(200);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
  const { data, error } = await query;
  if (error) return error.code === "22P02" ? jsonError(400, "Parameter status tidak valid.") : pgError(error);
  return NextResponse.json({ documents: data });
}
