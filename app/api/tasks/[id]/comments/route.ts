import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";

/** GET /api/tasks/[id]/comments — riwayat diskusi kontekstual per tugas/sub-event. */
export async function GET(_req: NextRequest, rc: RouteContext<"/api/tasks/[id]/comments">) {
  const g = await guard("tasks:read_all", "tasks:read_division", "tasks:read_own");
  if ("res" in g) return g.res;

  const { id } = await rc.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "ID tugas tidak valid.");

  const { data, error } = await g.ctx.supabase
    .from("task_comments")
    .select("id,task_id,author_id,body,created_at,author:profiles!author_id(full_name,role_code)")
    .eq("task_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return pgError(error);
  return NextResponse.json({ comments: data });
}

/** POST /api/tasks/[id]/comments — kirim komentar diskusi pada tugas/sub-event. */
export async function POST(req: NextRequest, rc: RouteContext<"/api/tasks/[id]/comments">) {
  const g = await guard("tasks:read_all", "tasks:read_division", "tasks:read_own");
  if ("res" in g) return g.res;

  const { id } = await rc.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "ID tugas tidak valid.");

  const payload = await req.json().catch(() => null);
  const text = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (text.length < 1 || text.length > 2000) {
    return jsonError(400, "Komentar harus 1–2000 karakter.");
  }

  const { data, error } = await g.ctx.supabase
    .from("task_comments")
    .insert({ task_id: id, author_id: g.ctx.profile.id, body: text })
    .select("id,task_id,author_id,body,created_at,author:profiles!author_id(full_name,role_code)")
    .single();

  if (error) return pgError(error);
  return NextResponse.json({ comment: data }, { status: 201 });
}
