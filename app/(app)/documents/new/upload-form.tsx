"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { btn, cx, Field, inputCls, Panel } from "@/components/ui";
import { CATEGORIES, formatBytes, validateFile, validateMeta, type MetaErrors } from "@/lib/documents/shared";

export function UploadForm() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<MetaErrors>({});
  const [formError, setFormError] = useState<string>();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    setErrors((e) => ({ ...e, file: f ? validateFile(f) : undefined }));
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0] ?? null); };

  async function submit(intent: "submit" | "draft", form: HTMLFormElement) {
    const fd = new FormData(form);
    const meta = { title: String(fd.get("title") ?? ""), category: String(fd.get("category") ?? ""), recipient: String(fd.get("recipient") ?? "") };
    const next: MetaErrors = { ...validateMeta(meta), file: validateFile(file) };
    Object.keys(next).forEach((k) => next[k as keyof MetaErrors] || delete next[k as keyof MetaErrors]);
    setErrors(next);
    if (Object.keys(next).length) return;

    fd.set("file", file!); fd.set("intent", intent);
    setBusy(true); setFormError(undefined);
    const res = await fetch("/api/documents/submit", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErrors(body.fields ?? {});
      return setFormError(body.error ?? "Gagal mengajukan surat.");
    }
    router.push(`/documents/${body.id}`);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit("submit", e.currentTarget); }} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Panel className="space-y-5 p-6">
        <Field label="Perihal surat" htmlFor="title" error={errors.title}>
          <input id="title" name="title" className={inputCls} aria-invalid={!!errors.title} placeholder="Permohonan izin penggunaan Gedung Research Center" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="category" error={errors.category}>
            <select id="category" name="category" defaultValue="" className={inputCls} aria-invalid={!!errors.category}>
              <option value="" disabled>Pilih kategori</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Nomor surat" htmlFor="doc_number" hint="Opsional">
            <input id="doc_number" name="doc_number" className={inputCls} />
          </Field>
        </div>
        <Field label="Ditujukan kepada" htmlFor="recipient" error={errors.recipient}>
          <input id="recipient" name="recipient" className={inputCls} aria-invalid={!!errors.recipient} placeholder="Direktorat Pendidikan ITS" />
        </Field>
        <Field label="Keterangan" htmlFor="description" hint="Opsional — konteks singkat untuk reviewer">
          <textarea id="description" name="description" rows={3} className={inputCls} />
        </Field>
      </Panel>

      <div className="space-y-4">
        <Panel className="p-6">
          <p className="mb-2 text-sm font-semibold">Berkas surat</p>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
            className={cx("flex flex-col items-center rounded-lg border-2 border-dashed px-4 py-9 text-center transition-colors",
              drag ? "border-petrol bg-petrol-wash" : errors.file ? "border-signal bg-signal-wash/40" : "border-line")}>
            {file ? (
              <>
                <p className="break-all font-semibold">{file.name}</p>
                <p className="text-sm text-ink-soft">{formatBytes(file.size)}</p>
                <button type="button" onClick={() => { pick(null); if (input.current) input.current.value = ""; }} className="mt-2 text-sm font-medium text-signal underline underline-offset-4">Hapus berkas</button>
              </>
            ) : (
              <>
                <p className="font-semibold">Seret berkas ke sini</p>
                <p className="mb-3 text-sm text-ink-soft">PDF atau DOCX, maksimal 10 MB</p>
                <button type="button" onClick={() => input.current?.click()} className={cx(btn.base, btn.secondary)}>Pilih dari perangkat</button>
              </>
            )}
            <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only" aria-label="Pilih berkas surat" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </div>
          {errors.file && <p role="alert" className="mt-2 text-sm font-medium text-signal">{errors.file}</p>}
        </Panel>
        {formError && <p role="alert" className="rounded-md bg-signal-wash px-3 py-2 text-sm font-medium text-signal">{formError}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={cx(btn.base, btn.primary)}>{busy ? "Mengunggah…" : "Ajukan surat"}</button>
          <button type="button" disabled={busy} className={cx(btn.base, btn.secondary)}
            onClick={(e) => submit("draft", e.currentTarget.form!)}>Simpan sebagai draft</button>
        </div>
      </div>
    </form>
  );
}
