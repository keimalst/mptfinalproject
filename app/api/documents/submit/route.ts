import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { validateMeta } from "@/lib/documents/shared";
import { uploadDocumentFile } from "@/lib/documents/upload";

/** POST /api/documents/submit (multipart) — unggah berkas + buat dokumen; intent=draft|submit (default submit). */
export async function POST(req: NextRequest) {
  const g = await guard("documents:create");
  if ("res" in g) return g.res;
  const { ctx } = g;
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError(400, "Body harus multipart/form-data.");
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const meta = { title: str("title"), category: str("category"), recipient: str("recipient") };
  const errors = validateMeta(meta);
  const file = form.get("file");
  if (!(file instanceof File)) errors.file = "Lampirkan berkas PDF atau DOCX.";
  if (Object.keys(errors).length) return jsonError(422, "Data surat belum lengkap.", { fields: errors });

  const id = crypto.randomUUID();
  const up = await uploadDocumentFile(ctx, id, file as File);
  if ("error" in up) return jsonError(up.error.status, up.error.message, { fields: { file: up.error.message } });

  const { error } = await ctx.supabase.from("documents").insert({
    id, ...meta, doc_number: str("doc_number") || null, description: str("description") || null,
    submitted_by: ctx.profile.id, file_path: up.ok.path, file_name: up.ok.name, file_size: up.ok.size, file_mime: up.ok.mime,
  });
  if (error) {
    await ctx.supabase.storage.from("documents").remove([up.ok.path]);
    return pgError(error);
  }
  if (str("intent") === "draft") return NextResponse.json({ id, status: "draft" }, { status: 201 });

  const t = await ctx.supabase.rpc("transition_document", { p_document_id: id, p_to_status: "submitted" });
  if (t.error) return pgError(t.error);
  return NextResponse.json({ id, status: "submitted" }, { status: 201 });
}
