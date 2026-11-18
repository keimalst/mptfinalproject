// Dipakai server (validasi API) DAN client (validasi form) — jangan impor modul server-only di sini.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
};
export const CATEGORIES = [
  { value: "surat_izin", label: "Surat izin" },
  { value: "surat_tugas", label: "Surat tugas" },
  { value: "undangan", label: "Undangan" },
  { value: "proposal", label: "Proposal" },
  { value: "lpj", label: "LPJ" },
  { value: "lainnya", label: "Lainnya" },
] as const;

export type DocStatus = "draft" | "submitted" | "reviewed" | "revision_needed" | "approved" | "rejected";
export const STATUS_META: Record<DocStatus, { label: string; tone: "neutral" | "info" | "warn" | "ok" | "bad" }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Diajukan", tone: "info" },
  reviewed: { label: "Direview", tone: "info" },
  revision_needed: { label: "Perlu revisi", tone: "warn" },
  approved: { label: "Disetujui", tone: "ok" },
  rejected: { label: "Ditolak", tone: "bad" },
};

export type MetaErrors = Partial<Record<"title" | "category" | "recipient" | "file", string>>;

export function validateMeta(m: { title: string; category: string; recipient: string }): MetaErrors {
  const e: MetaErrors = {};
  if (m.title.trim().length < 3) e.title = "Perihal minimal 3 karakter.";
  if (m.title.trim().length > 200) e.title = "Perihal maksimal 200 karakter.";
  if (!CATEGORIES.some((c) => c.value === m.category)) e.category = "Pilih kategori surat.";
  if (m.recipient.trim().length < 2) e.recipient = "Tujuan surat wajib diisi.";
  return e;
}

export function validateFile(f: { size: number; type: string; name: string } | null, required = true): string | undefined {
  if (!f) return required ? "Lampirkan berkas PDF atau DOCX." : undefined;
  const okExt = /\.(pdf|docx)$/i.test(f.name);
  if (!ALLOWED_MIME[f.type] || !okExt) return "Format berkas harus PDF atau DOCX.";
  if (f.size <= 0) return "Berkas kosong.";
  if (f.size > MAX_FILE_BYTES) return "Ukuran berkas maksimal 10 MB.";
  return undefined;
}

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
