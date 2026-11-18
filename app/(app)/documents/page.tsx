import Link from "next/link";
import { requirePermission } from "@/lib/auth/dal";
import { btn, cx, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { CATEGORIES, STATUS_META, type DocStatus } from "@/lib/documents/shared";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Persuratan" };

type Row = {
  id: string; title: string; category: string; recipient: string; status: DocStatus; revision_no: number; updated_at: string;
  submitter: { full_name: string } | null; division: { name: string } | null;
};

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const ctx = await requirePermission("documents:read_all", "documents:read_division", "documents:create");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in STATUS_META ? (sp.status as DocStatus) : null;

  let q = ctx.supabase.from("documents")
    .select("id,title,category,recipient,status,revision_no,updated_at,submitter:profiles!submitted_by(full_name),division:divisions(name)")
    .order("updated_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;

  return (
    <>
      <PageHeader title="Persuratan Birokrasi" description="Pantau posisi setiap surat dalam alur Draft → Diajukan → Direview → Disetujui."
        actions={ctx.can("documents:create") ? <Link href="/documents/new" className={cx(btn.base, btn.primary)}>Ajukan surat baru</Link> : null} />
      <nav aria-label="Filter status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {[{ k: null, l: "Semua" }, ...Object.entries(STATUS_META).map(([k, m]) => ({ k, l: m.label }))].map(({ k, l }) => (
          <Link key={l} href={k ? `/documents?status=${k}` : "/documents"} aria-current={status === k ? "true" : undefined}
            className={cx("rounded-full border px-3 py-1 font-medium", status === k ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-soft hover:text-ink")}>{l}</Link>
        ))}
      </nav>
      <Panel className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-ink-soft">Belum ada surat{status ? ` berstatus “${STATUS_META[status].label}”` : ""}.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-left text-ink-soft">
              <th className="px-5 py-3 font-medium">Perihal</th><th className="px-3 py-3 font-medium">Pengaju</th>
              <th className="px-3 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Diperbarui</th>
            </tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t border-line hover:bg-petrol-wash/40">
                  <td className="px-5 py-3">
                    <Link href={`/documents/${d.id}`} className="font-semibold text-ink underline-offset-4 hover:text-petrol hover:underline">{d.title}</Link>
                    <p className="text-xs text-ink-soft">{catLabel(d.category)} · kepada {d.recipient}{d.revision_no ? ` · revisi ke-${d.revision_no}` : ""}</p>
                  </td>
                  <td className="px-3 py-3">{d.submitter?.full_name ?? "—"}<p className="text-xs text-ink-soft">{d.division?.name}</p></td>
                  <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                  <td className="tabular px-5 py-3 text-right text-ink-soft">{fmtDate(d.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
