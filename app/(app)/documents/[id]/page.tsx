import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/dal";
import { cx, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { CATEGORIES, formatBytes, STATUS_META, type DocStatus } from "@/lib/documents/shared";
import { fmtDateTime } from "@/lib/format";
import { ActionPanel } from "./action-panel";
import { RealtimeRefresh } from "./realtime-refresh";

const FLOW: DocStatus[] = ["draft", "submitted", "reviewed", "approved"];

export async function generateMetadata() {
  return { title: "Detail Surat" };
}

export default async function DocumentDetail({ params }: PageProps<"/documents/[id]">) {
  const ctx = await requirePermission("documents:read_all", "documents:read_division", "documents:create");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [doc, history, avail] = await Promise.all([
    ctx.supabase.from("documents")
      .select("*, submitter:profiles!submitted_by(full_name), division:divisions(name)").eq("id", id).maybeSingle(),
    ctx.supabase.from("document_status_history")
      .select("id,from_status,to_status,note,created_at,actor:profiles!actor_id(full_name,role_code)")
      .eq("document_id", id).order("created_at").order("id"),
    ctx.supabase.rpc("document_available_transitions", { p_document_id: id }),
  ]);
  if (!doc.data) notFound();
  const d = doc.data as typeof doc.data & { submitter: { full_name: string } | null; division: { name: string } | null; status: DocStatus };

  const reached = new Set(history.data?.map((h) => h.to_status as DocStatus));
  const closed = d.status === "rejected" ? "rejected" : d.status === "revision_needed" ? "revision_needed" : null;
  const catLabel = CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category;

  return (
    <>
      <RealtimeRefresh documentId={id} />
      <Link href="/documents" className="mb-3 inline-block text-sm font-medium text-petrol underline-offset-4 hover:underline">Semua surat</Link>
      <PageHeader title={d.title} description={`${catLabel} · kepada ${d.recipient}${d.doc_number ? ` · No. ${d.doc_number}` : ""}`} actions={<StatusBadge status={d.status} />} />

      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Posisi surat dalam alur persetujuan">
        {FLOW.map((s) => {
          const done = reached.has(s);
          const current = d.status === s;
          return (
            <li key={s} className="text-sm">
              <div className={cx("h-1.5 rounded-full", current ? "bg-petrol" : done ? "bg-petrol/45" : "bg-line")} />
              <p className={cx("mt-1.5 font-semibold", current ? "text-petrol-deep" : done ? "text-ink" : "text-ink-soft")}>{STATUS_META[s].label}</p>
            </li>
          );
        })}
      </ol>
      {closed && (
        <p className={cx("-mt-4 mb-8 rounded-md px-3 py-2 text-sm font-medium", closed === "rejected" ? "bg-signal-wash text-signal" : "bg-amber-wash text-amber")}>
          {closed === "rejected" ? "Surat ini ditolak dan alur dihentikan." : "Surat dikembalikan untuk revisi. Pengaju dapat mengajukan ulang dengan berkas terbaru."}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Panel className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Informasi surat</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
              <dt className="text-ink-soft">Pengaju</dt><dd className="font-medium">{d.submitter?.full_name ?? "—"}{d.division ? ` · ${d.division.name}` : ""}</dd>
              <dt className="text-ink-soft">Dibuat</dt><dd className="font-medium">{fmtDateTime(d.created_at)}</dd>
              <dt className="text-ink-soft">Revisi</dt><dd className="font-medium">{d.revision_no === 0 ? "Berkas awal" : `Revisi ke-${d.revision_no}`}</dd>
              {d.description && (<><dt className="text-ink-soft">Keterangan</dt><dd>{d.description}</dd></>)}
            </dl>
            <a href={`/api/documents/${id}/file`} className="flex items-center justify-between gap-3 rounded-md border border-line px-4 py-3 hover:bg-petrol-wash">
              <span className="min-w-0"><span className="block truncate font-semibold">{d.file_name}</span><span className="text-xs text-ink-soft">{formatBytes(d.file_size)} · unduh</span></span>
            </a>
          </Panel>
          <ActionPanel documentId={id} status={d.status}
            available={(avail.data ?? []) as { to_status: DocStatus; note_required: boolean }[]} />
        </div>

        <Panel className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Riwayat persetujuan</h2>
          <ol className="relative space-y-5 border-l border-line pl-6">
            {(history.data ?? []).map((h) => {
              const actor = (Array.isArray(h.actor) ? h.actor[0] : h.actor) as { full_name: string } | null;
              const meta = STATUS_META[h.to_status as DocStatus];
              return (
                <li key={h.id} className="relative">
                  <span className={cx("absolute -left-[31px] top-1 size-3 rounded-full ring-4 ring-card",
                    meta.tone === "ok" ? "bg-ok" : meta.tone === "bad" ? "bg-signal" : meta.tone === "warn" ? "bg-amber" : "bg-petrol")} />
                  <p className="font-semibold">{meta.label}</p>
                  <p className="text-xs text-ink-soft">{actor?.full_name ?? "Sistem"} · {fmtDateTime(h.created_at)}</p>
                  {h.note && <p className="mt-1.5 rounded-md bg-paper px-3 py-2 text-sm">{h.note}</p>}
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>
    </>
  );
}
