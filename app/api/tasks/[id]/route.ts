import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["todo", "in_progress", "done"];

/** PATCH /api/tasks/[id] — pembaruan status cepat (1-klik Staff) atau detail tugas (Kadiv/Ketua/Admin). */
export async function PATCH(req: NextRequest, rc: RouteContext<"/api/tasks/[id]">) {
  const g = await guard("tasks:update_all", "tasks:update_division", "tasks:update_own");
  if ("res" in g) return g.res;

  const { id } = await rc.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "ID tugas tidak valid.");

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError(400, "Payload JSON tidak valid.");

  const canManage = g.ctx.can("tasks:update_all", "tasks:update_division");
  const patch: Record<string, unknown> = {};

  if ("status" in body) {
    if (!STATUSES.includes(body.status)) return jsonError(400, "Status tugas tidak valid.");
    patch.status = body.status;
  }

  if (canManage) {
    if ("title" in body) {
      const t = typeof body.title === "string" ? body.title.trim() : "";
      if (t.length < 3 || t.length > 200) return jsonError(400, "Judul tugas harus 3–200 karakter.");
      patch.title = t;
    }
    if ("description" in body) patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if ("assignee_id" in body) patch.assignee_id = body.assignee_id || null;
    if ("priority" in body) {
      if (!PRIORITIES.includes(body.priority)) return jsonError(400, "Prioritas tidak valid.");
      patch.priority = body.priority;
    }
    if ("weight" in body) {
      const w = Number(body.weight);
      if (!Number.isInteger(w) || w < 1 || w > 5) return jsonError(400, "Bobot tugas harus 1–5.");
      patch.weight = w;
    }
    if ("sub_event" in body) patch.sub_event = typeof body.sub_event === "string" ? body.sub_event.trim() || null : null;
    if ("due_date" in body) patch.due_date = body.due_date || null;
  }

  if (!Object.keys(patch).length) return jsonError(400, "Tidak ada perubahan yang diizinkan.");

  const { data, error } = await g.ctx.supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("id,title,description,division_id,assignee_id,priority,status,weight,sub_event,due_date,completed_at,updated_at")
    .maybeSingle();

  if (error) return pgError(error);
  if (!data) return jsonError(404, "Tugas tidak ditemukan atau tidak berwenang.");
  return NextResponse.json({ task: data });
}
