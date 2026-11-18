import "server-only";
import type { AuthContext } from "@/lib/auth/dal";
import { ALLOWED_MIME, validateFile } from "./shared";

export type UploadedFile = { path: string; name: string; size: number; mime: string };

const safeName = (n: string) =>
  n.normalize("NFKD").replace(/[^\w.\- ]+/g, "").trim().replace(/\s+/g, "_").slice(-120) || "berkas";

/** Validasi tipe/ukuran + magic bytes lalu unggah ke bucket privat `documents`. */
export async function uploadDocumentFile(
  ctx: AuthContext, documentId: string, file: File,
): Promise<{ ok: UploadedFile } | { error: { status: number; message: string } }> {
  const bad = validateFile(file);
  if (bad) return { error: { status: 422, message: bad } };
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04; // PK..
  if ((ALLOWED_MIME[file.type] === "PDF" && !isPdf) || (ALLOWED_MIME[file.type] === "DOCX" && !isZip))
    return { error: { status: 422, message: "Isi berkas tidak sesuai dengan formatnya." } };

  const path = `${ctx.profile.id}/${documentId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await ctx.supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: { status: 500, message: "Gagal mengunggah berkas." } };
  return { ok: { path, name: file.name, size: file.size, mime: file.type } };
}
