import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError } from "@/lib/api";

/** GET /api/documents/[id]/file — redirect ke signed URL (60 detik). Akses mengikuti RLS dokumen. */
export async function GET(_req: NextRequest, rc: RouteContext<"/api/documents/[id]/file">) {
  const g = await guard("documents:read_all", "documents:read_division", "documents:create");
  if ("res" in g) return g.res;
  const { id } = await rc.params;
  const doc = await g.ctx.supabase.from("documents").select("file_path,file_name").eq("id", id).maybeSingle();
  if (!doc.data) return jsonError(404, "Dokumen tidak ditemukan.");
  const signed = await g.ctx.supabase.storage.from("documents").createSignedUrl(doc.data.file_path, 60, { download: doc.data.file_name });
  if (signed.error || !signed.data) return jsonError(500, "Gagal membuat tautan unduhan.");
  return NextResponse.redirect(signed.data.signedUrl);
}
