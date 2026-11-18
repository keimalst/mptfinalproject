"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, cx, Panel } from "@/components/ui";
import { dueLabel } from "@/lib/format";
import type { DashboardData, DivisionIpms, UrgencyTask } from "@/lib/dashboard";

const scoreTone = (s: number | null) => (s == null ? "text-ink-soft" : s >= 80 ? "text-ok" : s >= 60 ? "text-amber" : "text-signal");
const PRIORITY: Record<UrgencyTask["priority"], string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", critical: "Kritis" };

export function DashboardView({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<"all" | "critical">("all");
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.parse(initial.generated_at));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/dashboard/ipms", { cache: "no-store" });
    if (res.ok) {
      const next = (await res.json()) as DashboardData;
      setData(next);
      setNow(Date.parse(next.generated_at));
    }
  }, []);

  // Realtime: setiap perubahan tugas -> muat ulang dari API (di-debounce).
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(refetch, 400);
      })
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const tasks = useMemo(() => (filter === "critical" ? data.tasks.filter((t) => t.urgency === "critical") : data.tasks), [data.tasks, filter]);
  const o = data.overall;
  const criticalCount = data.tasks.filter((t) => t.urgency === "critical").length;

  if (!o || data.divisions.length === 0)
    return <Panel className="p-8 text-ink-soft">Belum ada data divisi untuk ditampilkan. Pastikan akun Anda sudah ditetapkan ke sebuah divisi.</Panel>;

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 divide-line overflow-hidden rounded-lg border border-line bg-card lg:grid-cols-4 lg:divide-x">
        <Kpi label={data.scope === "all" ? "Skor IPMS gabungan" : "Skor IPMS divisi"} value={o.ipms_score == null ? "—" : o.ipms_score.toFixed(1)} tone={scoreTone(o.ipms_score)} big />
        <Kpi label="Progres tugas" value={`${o.progress_pct}%`} />
        <Kpi label="Tugas selesai" value={`${o.done_tasks} / ${o.total_tasks}`} />
        <Kpi label="Tugas urgensi kritis" value={String(o.critical_tasks)} tone={o.critical_tasks ? "text-signal" : undefined} />
      </dl>

      <Panel>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-lg font-semibold">{data.scope === "all" ? "Progres per divisi" : "Progres divisi"}</h2>
          <span className="flex items-center gap-2 text-xs text-ink-soft" aria-live="polite">
            <span className={cx("size-2 rounded-full", live ? "live-dot bg-ok" : "bg-line")} />
            {live ? "Pembaruan langsung aktif" : "Menghubungkan…"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-ink-soft">
                <th className="px-5 py-2.5 font-medium">Divisi</th>
                <th className="px-3 py-2.5 font-medium">Komposisi tugas</th>
                <th className="px-3 py-2.5 text-right font-medium">Progres</th>
                <th className="px-3 py-2.5 text-right font-medium">Kritis</th>
                <th className="px-5 py-2.5 text-right font-medium">IPMS</th>
              </tr>
            </thead>
            <tbody>{data.divisions.map((d) => <DivisionRow key={d.division_id} d={d} />)}</tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-ink-soft">
          IPMS = 50% progres berbobot + 30% ketepatan waktu + 20% kesehatan jadwal. Hijau ≥ 80, kuning ≥ 60, merah di bawahnya.
        </p>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-lg font-semibold">Tugas aktif</h2>
          <div role="group" aria-label="Filter urgensi" className="inline-flex rounded-md border border-line p-0.5 text-sm">
            {([["all", `Semua (${data.tasks.length})`], ["critical", `Urgensi kritis (${criticalCount})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                className={cx("rounded px-3 py-1 font-medium transition-colors", filter === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {tasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ink-soft">{filter === "critical" ? "Tidak ada tugas dengan urgensi kritis. Bagus." : "Tidak ada tugas aktif."}</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span className={cx("h-8 w-1 rounded-full", t.urgency === "critical" ? "bg-signal" : t.urgency === "warning" ? "bg-amber" : "bg-line")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.title}</p>
                  <p className="text-xs text-ink-soft">{t.division_name}{t.assignee_name ? ` · ${t.assignee_name}` : ""} · Prioritas {PRIORITY[t.priority].toLowerCase()} · Bobot {t.weight}</p>
                </div>
                <Badge tone={t.urgency === "critical" ? "bad" : t.urgency === "warning" ? "warn" : "neutral"}>{dueLabel(t.due_date, now)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Kpi({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="border-b border-line px-5 py-4 last:border-b-0 max-lg:odd:border-r lg:border-b-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className={cx("tabular mt-1 font-display font-semibold", big ? "text-4xl" : "text-3xl", tone)}>{value}</dd>
    </div>
  );
}

function DivisionRow({ d }: { d: DivisionIpms }) {
  const total = Math.max(d.total_tasks, 1);
  const open = d.total_tasks - d.done_tasks;
  const seg = [
    { n: d.done_tasks, cls: "bg-ok", label: "selesai" },
    { n: d.in_progress_tasks, cls: "bg-petrol", label: "berjalan" },
    { n: Math.max(open - d.in_progress_tasks, 0), cls: "bg-line", label: "belum mulai" },
  ];
  return (
    <tr className="border-t border-line">
      <td className="px-5 py-3 font-semibold">{d.division_name}</td>
      <td className="px-3 py-3">
        <div className="flex h-2.5 w-full min-w-40 overflow-hidden rounded-full bg-line/50" role="img"
          aria-label={`${d.done_tasks} selesai, ${d.in_progress_tasks} berjalan dari ${d.total_tasks} tugas`}>
          {d.total_tasks > 0 && seg.map((s) => <span key={s.label} className={s.cls} style={{ width: `${(100 * s.n) / total}%` }} />)}
        </div>
        <p className="mt-1 text-xs text-ink-soft">{d.done_tasks}/{d.total_tasks} selesai{d.overdue_tasks ? ` · ${d.overdue_tasks} terlambat` : ""}</p>
      </td>
      <td className="tabular px-3 py-3 text-right font-semibold">{d.progress_pct}%</td>
      <td className={cx("tabular px-3 py-3 text-right font-semibold", d.critical_tasks ? "text-signal" : "text-ink-soft")}>{d.critical_tasks}</td>
      <td className={cx("tabular px-5 py-3 text-right font-display text-xl font-semibold", scoreTone(d.ipms_score))}>
        {d.ipms_score == null ? "—" : d.ipms_score.toFixed(1)}
      </td>
    </tr>
  );
}
