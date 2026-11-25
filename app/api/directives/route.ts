import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["unread", "acknowledged", "resolved"];

/** GET /api/directives?status= — daftar arahan strategis Pembina. */
export async function GET(req: NextRequest) {
  const g = await guard("directives:read");
  if ("res" in g) return g.res;

  const status = req.nextUrl.searchParams.get("status");
  if (status && !STATUSES.includes(status)) {
    return jsonError(400, "Parameter status tidak valid.");
  }

  let query = g.ctx.supabase
    .from("strategic_directives")
    .select("id,title,content,priority,status,created_by,acknowledged_by,acknowledged_at,resolved_by,resolved_at,resolution_note,created_at,updated_at,author:profiles!created_by(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return pgError(error);
  return NextResponse.json({ directives: data });
}

/** POST /api/directives — buat catatan arahan strategis baru (Pembina). */
export async function POST(req: NextRequest) {
  const g = await guard("directives:create");
  if ("res" in g) return g.res;

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const priority = typeof body?.priority === "string" ? body.priority : "high";

  if (title.length < 3 || title.length > 200) return jsonError(400, "Judul arahan harus 3–200 karakter.");
  if (content.length < 5) return jsonError(400, "Isi arahan minimal 5 karakter.");
  if (!PRIORITIES.includes(priority)) return jsonError(400, "Prioritas arahan tidak valid.");

  const { data, error } = await g.ctx.supabase
    .from("strategic_directives")
    .insert({ title, content, priority, created_by: g.ctx.profile.id })
    .select("id,title,content,priority,status,created_by,created_at,updated_at")
    .single();

  if (error) return pgError(error);
  return NextResponse.json({ directive: data }, { status: 201 });
}

/** PATCH /api/directives — tandai arahan sebagai acknowledged / resolved (Ketua Pelaksana). */
export async function PATCH(req: NextRequest) {
  const g = await guard("directives:resolve");
  if ("res" in g) return g.res;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const resolutionNote = typeof body?.resolution_note === "string" ? body.resolution_note.trim() : null;

  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "ID arahan tidak valid.");
  if (status !== "acknowledged" && status !== "resolved") {
    return jsonError(400, "Status tujuan harus 'acknowledged' atau 'resolved'.");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status };
  if (status === "acknowledged") {
    patch.acknowledged_by = g.ctx.profile.id;
    patch.acknowledged_at = now;
  } else {
    patch.resolved_by = g.ctx.profile.id;
    patch.resolved_at = now;
    if (resolutionNote) patch.resolution_note = resolutionNote;
  }

  const { data, error } = await g.ctx.supabase
    .from("strategic_directives")
    .update(patch)
    .eq("id", id)
    .select("id,title,content,priority,status,acknowledged_by,acknowledged_at,resolved_by,resolved_at,resolution_note,updated_at")
    .maybeSingle();

  if (error) return pgError(error);
  if (!data) return jsonError(404, "Arahan tidak ditemukan.");

  await g.ctx.supabase.from("audit_logs").insert({
    entity_type: "directive",
    entity_id: data.id,
    action: `directive_${status}`,
    actor_id: g.ctx.profile.id,
    summary: `Arahan (${status}): ${data.title}`,
    metadata: { resolution_note: resolutionNote },
  });

  return NextResponse.json({ directive: data });
}
