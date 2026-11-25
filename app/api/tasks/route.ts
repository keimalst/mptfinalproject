import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["todo", "in_progress", "done"];

/** GET /api/tasks?division_id=&status=&sub_event=&mine=1 — daftar tugas lintas/dalam divisi (dibatasi RLS). */
export async function GET(req: NextRequest) {
  const g = await guard("tasks:read_all", "tasks:read_division", "tasks:read_own");
  if ("res" in g) return g.res;

  const sp = req.nextUrl.searchParams;
  const divisionId = sp.get("division_id");
  const status = sp.get("status");
  const subEvent = sp.get("sub_event")?.trim();
  const mine = sp.get("mine");

  if (divisionId && !/^[0-9a-f-]{36}$/i.test(divisionId)) return jsonError(400, "Parameter division_id tidak valid.");
  if (status && !STATUSES.includes(status)) return jsonError(400, "Parameter status tidak valid.");

  let query = g.ctx.supabase
    .from("tasks")
    .select("id,title,description,division_id,assignee_id,priority,status,weight,sub_event,due_date,completed_at,created_by,created_at,updated_at,division:divisions(code,name),assignee:profiles!assignee_id(id,full_name,email)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (divisionId) query = query.eq("division_id", divisionId);
  if (status) query = query.eq("status", status);
  if (subEvent) query = query.ilike("sub_event", `%${subEvent.replace(/[%_,]/g, " ")}%`);
  if (mine === "1" || mine === "true") query = query.eq("assignee_id", g.ctx.profile.id);

  const { data, error } = await query;
  if (error) return pgError(error);
  return NextResponse.json({ tasks: data });
}

/** POST /api/tasks — delegasi tugas baru lintas/dalam divisi. */
export async function POST(req: NextRequest) {
  const g = await guard("tasks:create");
  if ("res" in g) return g.res;

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() || null : null;
  const divisionId = typeof body?.division_id === "string" ? body.division_id : (g.ctx.profile.divisionId ?? "");
  const assigneeId = typeof body?.assignee_id === "string" && body.assignee_id ? body.assignee_id : null;
  const priority = typeof body?.priority === "string" ? body.priority : "medium";
  const weight = body?.weight != null ? Number(body.weight) : 1;
  const subEvent = typeof body?.sub_event === "string" ? body.sub_event.trim() || null : null;
  const dueDate = typeof body?.due_date === "string" && body.due_date ? body.due_date : null;

  if (title.length < 3 || title.length > 200) return jsonError(400, "Judul tugas harus 3–200 karakter.");
  if (!/^[0-9a-f-]{36}$/i.test(divisionId)) return jsonError(400, "Divisi tujuan tidak valid.");
  if (assigneeId && !/^[0-9a-f-]{36}$/i.test(assigneeId)) return jsonError(400, "Assignee tidak valid.");
  if (!PRIORITIES.includes(priority)) return jsonError(400, "Prioritas tidak valid.");
  if (!Number.isInteger(weight) || weight < 1 || weight > 5) return jsonError(400, "Bobot tugas harus bilangan bulat 1–5.");

  const { data, error } = await g.ctx.supabase
    .from("tasks")
    .insert({
      title,
      description,
      division_id: divisionId,
      assignee_id: assigneeId,
      priority,
      weight,
      sub_event: subEvent,
      due_date: dueDate,
      created_by: g.ctx.profile.id,
    })
    .select("id,title,description,division_id,assignee_id,priority,status,weight,sub_event,due_date,created_at,updated_at")
    .single();

  if (error) return pgError(error);
  return NextResponse.json({ task: data }, { status: 201 });
}
