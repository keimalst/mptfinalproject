import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { uploadDocumentFile } from "@/lib/documents/upload";

const STATUSES = ["draft", "submitted", "reviewed", "revision_needed", "approved", "rejected"];

/**
 * PATCH /api/documents/[id]/status — JSON {status, note?} atau multipart (status, note, file) untuk ajukan ulang
 * dengan berkas revisi. Aturan state machine ditegakkan di database (RPC transition_document).
 */
export async function PATCH(req: NextRequest, rc: RouteContext<"/api/documents/[id]/status">) {
  const g = await guard("documents:read_all", "documents:read_division", "documents:create");
  if ("res" in g) return g.res;
  const { ctx } = g;
  const { id } = await rc.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "ID dokumen tidak valid.");

  let status: string, note: string | null = null, file: File | null = null;
  if (req.headers.get("content-type")?.includes("multipart/form-data")) {
    const f = await req.formData();
    status = String(f.get("status") ?? ""); note = String(f.get("note") ?? "") || null;
    const raw = f.get("file"); file = raw instanceof File && raw.size > 0 ? raw : null;
  } else {
    const b = await req.json().catch(() => null);
    status = String(b?.status ?? ""); note = typeof b?.note === "string" ? b.note : null;
  }
  if (!STATUSES.includes(status)) return jsonError(400, "Status tujuan tidak valid.");

  let up: Awaited<ReturnType<typeof uploadDocumentFile>> | null = null;
  if (file) {
    up = await uploadDocumentFile(ctx, id, file);
    if ("error" in up) return jsonError(up.error.status, up.error.message);
  }
  const { data, error } = await ctx.supabase.rpc("transition_document", {
    p_document_id: id, p_to_status: status, p_note: note,
    p_file_path: up && "ok" in up ? up.ok.path : null, p_file_name: up && "ok" in up ? up.ok.name : null,
    p_file_size: up && "ok" in up ? up.ok.size : null, p_file_mime: up && "ok" in up ? up.ok.mime : null,
  });
  if (error) {
    if (up && "ok" in up) await ctx.supabase.storage.from("documents").remove([up.ok.path]);
    return pgError(error);
  }
  return NextResponse.json({ document: data });
}
