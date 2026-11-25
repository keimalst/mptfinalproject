"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, btn, cx, Field, inputCls, Panel } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export type AuditRow = {
  id: number;
  entity_type: "document" | "task" | "role" | "directive";
  entity_id: string;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string; role_code: string } | null;
  division: { name: string } | null;
};

export type DirectiveRow = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "unread" | "acknowledged" | "resolved";
  created_by: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  author: { full_name: string } | null;
};

type Props = {
  initialAudits: AuditRow[];
  initialDirectives: DirectiveRow[];
  permissions: {
    canAudit: boolean;
    canCreateDirective: boolean;
    canResolveDirective: boolean;
  };
};

const ENTITY_LABEL: Record<AuditRow["entity_type"], string> = {
  document: "Persuratan",
  directive: "Arahan Pembina",
  role: "Hak Akses",
  task: "Tugas",
};

const ENTITY_TONE: Record<AuditRow["entity_type"], "info" | "warn" | "neutral" | "ok"> = {
  document: "info",
  directive: "warn",
  role: "neutral",
  task: "ok",
};

const PRIORITY_META: Record<DirectiveRow["priority"], { label: string; tone: "neutral" | "info" | "warn" | "bad" }> = {
  low: { label: "Rendah", tone: "neutral" },
  medium: { label: "Sedang", tone: "info" },
  high: { label: "Tinggi", tone: "warn" },
  critical: { label: "Kritis", tone: "bad" },
};

const DIRECTIVE_STATUS_META: Record<DirectiveRow["status"], { label: string; tone: "warn" | "info" | "ok" }> = {
  unread: { label: "Baru / Belum Dibaca", tone: "warn" },
  acknowledged: { label: "Diterima Ketua", tone: "info" },
  resolved: { label: "Ditindaklanjuti", tone: "ok" },
};

export function PengawasanView({ initialAudits, initialDirectives, permissions }: Props) {
  const router = useRouter();
  const [directives, setDirectives] = useState(initialDirectives);
  const [audits, setAudits] = useState(initialAudits);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form buat arahan baru (Pembina)
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<DirectiveRow["priority"]>("high");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();

  // State tindak lanjut arahan (Ketua)
  const [activeResolveId, setActiveResolveId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>();

  async function refreshData() {
    const [dRes, aRes] = await Promise.all([
      fetch("/api/directives", { cache: "no-store" }),
      permissions.canAudit ? fetch("/api/audit-logs", { cache: "no-store" }) : Promise.resolve(null),
    ]);
    if (dRes.ok) {
      const dJson = await dRes.json();
      if (Array.isArray(dJson.directives)) setDirectives(dJson.directives);
    }
    if (aRes && aRes.ok) {
      const aJson = await aRes.json();
      if (Array.isArray(aJson.audit_logs)) setAudits(aJson.audit_logs);
    }
    router.refresh();
  }

  async function handleCreateDirective(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    if (title.trim().length < 3) return setFormError("Judul arahan minimal 3 karakter.");
    if (content.trim().length < 5) return setFormError("Isi arahan minimal 5 karakter.");

    setCreating(true);
    const res = await fetch("/api/directives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), priority }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      setFormError(body.error ?? "Gagal mengirim arahan strategis.");
      return;
    }

    setTitle("");
    setContent("");
    setPriority("high");
    await refreshData();
  }

  async function handleUpdateDirective(id: string, status: "acknowledged" | "resolved") {
    setActionError(undefined);
    setUpdatingId(id);
    const res = await fetch("/api/directives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        resolution_note: status === "resolved" ? resolutionNote.trim() || null : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setUpdatingId(null);

    if (!res.ok) {
      setActionError(body.error ?? "Gagal memperbarui status arahan.");
      return;
    }

    if (status === "resolved") {
      setActiveResolveId(null);
      setResolutionNote("");
    }
    await refreshData();
  }

  const filteredDirectives = directives.filter((d) => (statusFilter === "all" ? true : d.status === statusFilter));
  const filteredAudits = audits.filter((a) => (entityFilter === "all" ? true : a.entity_type === entityFilter));

  const unreadCount = directives.filter((d) => d.status === "unread").length;
  const resolvedCount = directives.filter((d) => d.status === "resolved").length;

  return (
    <div className="space-y-8">
      {/* Ringkasan KPI Pengawasan */}
      <dl className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Arahan Belum Dibaca</dt>
          <dd className="tabular mt-1 font-display text-3xl font-semibold text-amber">{unreadCount}</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Arahan Ditindaklanjuti</dt>
          <dd className="tabular mt-1 font-display text-3xl font-semibold text-ok">{resolvedCount}</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Total Log Aktivitas</dt>
          <dd className="tabular mt-1 font-display text-3xl font-semibold text-ink">{audits.length}</dd>
        </div>
      </dl>

      {/* Panel Arahan Strategis Pembina */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Panel Arahan Strategis Pembina</h2>
            <p className="text-sm text-ink-soft">Catatan strategis dari Pembina Organisasi yang wajib dipantau dan ditindaklanjuti Ketua Pelaksana.</p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { k: "all", l: "Semua" },
              { k: "unread", l: "Belum Dibaca" },
              { k: "acknowledged", l: "Diterima" },
              { k: "resolved", l: "Selesai" },
            ].map((item) => (
              <button
                key={item.k}
                type="button"
                onClick={() => setStatusFilter(item.k)}
                className={cx(
                  "rounded-full border px-3 py-1 font-medium transition-colors",
                  statusFilter === item.k ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-soft hover:text-ink",
                )}
              >
                {item.l}
              </button>
            ))}
          </div>
        </div>

        {/* Form Input Arahan (Khusus Pembina) */}
        {permissions.canCreateDirective && (
          <Panel className="p-6">
            <h3 className="mb-4 text-base font-semibold text-ink">Kirim Arahan Strategis Baru</h3>
            <form onSubmit={handleCreateDirective} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Field label="Judul Arahan" htmlFor="dir-title">
                    <input
                      id="dir-title"
                      type="text"
                      placeholder="Contoh: Percepatan Pengajuan Proposal Sponsor Utama"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Tingkat Urgensi" htmlFor="dir-priority">
                    <select
                      id="dir-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as DirectiveRow["priority"])}
                      className={inputCls}
                    >
                      <option value="low">Rendah</option>
                      <option value="medium">Sedang</option>
                      <option value="high">Tinggi</option>
                      <option value="critical">Kritis</option>
                    </select>
                  </Field>
                </div>
              </div>
              <Field label="Isi Catatan & Instruksi Strategis" htmlFor="dir-content">
                <textarea
                  id="dir-content"
                  rows={3}
                  placeholder="Tuliskan arahan kebijakan, target waktu, atau koreksi pelaksanaan acara..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={inputCls}
                  required
                />
              </Field>
              {formError && (
                <p role="alert" className="rounded-md bg-signal-wash px-3 py-2 text-sm font-medium text-signal">
                  {formError}
                </p>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={creating} className={cx(btn.base, btn.primary)}>
                  {creating ? "Mengirim Arahan…" : "Kirim Arahan ke Ketua"}
                </button>
              </div>
            </form>
          </Panel>
        )}

        {actionError && (
          <p role="alert" className="rounded-md bg-signal-wash px-4 py-2.5 text-sm font-medium text-signal">
            {actionError}
          </p>
        )}

        {/* Daftar Arahan */}
        <div className="space-y-3">
          {filteredDirectives.length === 0 ? (
            <Panel className="p-8 text-sm text-ink-soft">Belum ada catatan arahan strategis pada filter ini.</Panel>
          ) : (
            filteredDirectives.map((d) => {
              const pMeta = PRIORITY_META[d.priority];
              const sMeta = DIRECTIVE_STATUS_META[d.status];
              return (
                <Panel key={d.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={pMeta.tone}>Urgensi: {pMeta.label}</Badge>
                        <Badge tone={sMeta.tone}>{sMeta.label}</Badge>
                        <span className="text-xs text-ink-soft">
                          Oleh {d.author?.full_name ?? "Pembina"} · {fmtDateTime(d.created_at)}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-ink">{d.title}</h3>
                    </div>

                    {permissions.canResolveDirective && d.status !== "resolved" && (
                      <div className="flex flex-wrap gap-2">
                        {d.status === "unread" && (
                          <button
                            type="button"
                            disabled={updatingId === d.id}
                            onClick={() => handleUpdateDirective(d.id, "acknowledged")}
                            className={cx(btn.base, btn.secondary)}
                          >
                            {updatingId === d.id ? "Memproses…" : "Tandai Dibaca"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={updatingId === d.id}
                          onClick={() => {
                            setActiveResolveId(activeResolveId === d.id ? null : d.id);
                            setResolutionNote("");
                          }}
                          className={cx(btn.base, btn.primary)}
                        >
                          Tindak Lanjut Selesai
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{d.content}</p>

                  {d.resolution_note && (
                    <div className="mt-3 rounded-md border border-line bg-ok-wash/50 px-3.5 py-2.5 text-xs text-ink">
                      <span className="font-semibold text-ok">Catatan Tindak Lanjut Ketua: </span>
                      {d.resolution_note}
                      {d.resolved_at && <span className="ml-2 text-ink-soft">({fmtDateTime(d.resolved_at)})</span>}
                    </div>
                  )}

                  {activeResolveId === d.id && (
                    <div className="mt-4 space-y-3 border-t border-line pt-4">
                      <Field label="Catatan Tindak Lanjut (Opsional)" htmlFor={`res-${d.id}`}>
                        <input
                          id={`res-${d.id}`}
                          type="text"
                          placeholder="Contoh: Sudah dikoordinasikan dengan Kadiv Humas, proposal dikirim hari ini."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={updatingId === d.id}
                          onClick={() => handleUpdateDirective(d.id, "resolved")}
                          className={cx(btn.base, btn.primary)}
                        >
                          {updatingId === d.id ? "Menyimpan…" : "Konfirmasi Selesai"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveResolveId(null)}
                          className={cx(btn.base, btn.ghost)}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </Panel>
              );
            })
          )}
        </div>
      </section>

      {/* Tabel Audit Log Pengawasan */}
      {permissions.canAudit && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Audit Trail Aktivitas & Persetujuan</h2>
              <p className="text-sm text-ink-soft">Log kronologis otomatis untuk perubahan status persuratan, perubahan hak akses, dan arahan strategis.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { k: "all", l: "Semua Aktivitas" },
                { k: "document", l: "Persuratan" },
                { k: "directive", l: "Arahan Pembina" },
                { k: "role", l: "Hak Akses" },
              ].map((tab) => (
                <button
                  key={tab.k}
                  type="button"
                  onClick={() => setEntityFilter(tab.k)}
                  className={cx(
                    "rounded-full border px-3 py-1 font-medium transition-colors",
                    entityFilter === tab.k ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-soft hover:text-ink",
                  )}
                >
                  {tab.l}
                </button>
              ))}
            </div>
          </div>

          <Panel className="overflow-x-auto">
            {filteredAudits.length === 0 ? (
              <p className="p-8 text-sm text-ink-soft">Belum ada rekam jejak audit yang tercatat.</p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-ink-soft">
                    <th className="px-5 py-3 font-medium">Waktu</th>
                    <th className="px-3 py-3 font-medium">Modul</th>
                    <th className="px-3 py-3 font-medium">Ringkasan Aktivitas</th>
                    <th className="px-3 py-3 font-medium">Pelaku</th>
                    <th className="px-5 py-3 text-right font-medium">Divisi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudits.map((log) => (
                    <tr key={log.id} className="border-t border-line hover:bg-petrol-wash/40">
                      <td className="tabular whitespace-nowrap px-5 py-3 text-xs text-ink-soft">{fmtDateTime(log.created_at)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={ENTITY_TONE[log.entity_type]}>{ENTITY_LABEL[log.entity_type]}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink">{log.summary}</p>
                        <p className="text-xs text-ink-soft">Aksi: {log.action}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-ink">{log.actor?.full_name ?? "Sistem"}</p>
                        {log.actor?.role_code && <p className="text-xs uppercase text-ink-soft">{log.actor.role_code}</p>}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-ink-soft">{log.division?.name ?? "Lintas Divisi"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}
