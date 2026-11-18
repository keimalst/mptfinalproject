"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btn, cx, inputCls, Panel } from "@/components/ui";
import { validateFile, type DocStatus } from "@/lib/documents/shared";

type Transition = { to_status: DocStatus; note_required: boolean };

const LABEL = (to: DocStatus, from: DocStatus) =>
  to === "submitted" ? (from === "draft" ? "Ajukan surat" : "Ajukan ulang")
  : to === "reviewed" ? "Tandai sudah direview"
  : to === "approved" ? "Setujui"
  : to === "revision_needed" ? "Minta revisi" : "Tolak";
const STYLE = (to: DocStatus) => (to === "rejected" ? btn.danger : to === "revision_needed" ? btn.secondary : btn.primary);

export function ActionPanel({ documentId, status, available }: { documentId: string; status: DocStatus; available: Transition[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<DocStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (available.length === 0) {
    return (
      <Panel className="p-6 text-sm text-ink-soft">
        {status === "approved" || status === "rejected" ? "Alur persetujuan surat ini telah selesai." : "Tidak ada tindakan yang dapat Anda lakukan pada tahap ini."}
      </Panel>
    );
  }
  const resubmit = status === "revision_needed";
  const needsNote = available.some((a) => a.note_required);

  async function run(t: Transition) {
    setError(undefined);
    if (t.note_required && !note.trim()) return setError("Catatan wajib diisi untuk tindakan ini.");
    const fileErr = validateFile(file, false);
    if (fileErr) return setError(fileErr);
    setBusy(t.to_status);
    const fd = new FormData();
    fd.set("status", t.to_status); fd.set("note", note);
    if (file && t.to_status === "submitted") fd.set("file", file);
    const res = await fetch(`/api/documents/${documentId}/status`, { method: "PATCH", body: fd });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(body.error ?? "Gagal memperbarui status.");
    setNote(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <Panel className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Tindakan</h2>
      {resubmit && (
        <div>
          <label htmlFor="revfile" className="mb-1.5 block text-sm font-semibold">Berkas revisi <span className="font-normal text-ink-soft">(opsional)</span></label>
          <input id="revfile" ref={fileRef} type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
        </div>
      )}
      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-semibold">Catatan {needsNote ? <span className="font-normal text-ink-soft">(wajib untuk revisi/penolakan)</span> : <span className="font-normal text-ink-soft">(opsional)</span>}</label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
      </div>
      {error && <p role="alert" className="rounded-md bg-signal-wash px-3 py-2 text-sm font-medium text-signal">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {available.map((t) => (
          <button key={t.to_status} disabled={busy !== null} onClick={() => run(t)} className={cx(btn.base, STYLE(t.to_status))}>
            {busy === t.to_status ? "Memproses…" : LABEL(t.to_status, status)}
          </button>
        ))}
      </div>
    </Panel>
  );
}
