"use client";

import { useMemo, useState } from "react";
import { btn, cx, inputCls, Panel } from "@/components/ui";

type User = { id: string; full_name: string; email: string | null; role_code: string; division_id: string | null; is_active: boolean };
type Msg = { kind: "ok" | "err"; text: string };

export function UsersTable({ initialUsers, roles, divisions, meId }: {
  initialUsers: User[]; roles: { code: string; name: string }[]; divisions: { id: string; name: string }[]; meId: string;
}) {
  const [saved, setSaved] = useState(initialUsers);
  const [draft, setDraft] = useState<Record<string, Partial<User>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return saved.filter((u) => !s || u.full_name.toLowerCase().includes(s) || (u.email ?? "").toLowerCase().includes(s));
  }, [saved, q]);

  const set = (id: string, p: Partial<User>) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...p } }));

  async function save(u: User) {
    const changes = draft[u.id];
    if (!changes) return;
    setBusy(u.id); setMsg(null);
    const res = await fetch("/api/roles", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: u.id, ...changes }) });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg({ kind: "err", text: body.error ?? "Gagal menyimpan perubahan." });
    setSaved((all) => all.map((x) => (x.id === u.id ? body.user : x)));
    setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== u.id)));
    setMsg({ kind: "ok", text: `Perubahan untuk ${body.user.full_name || body.user.email} disimpan.` });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau email…" aria-label="Cari pengguna" className={cx(inputCls, "max-w-xs")} />
        <p role="status" aria-live="polite" className={cx("text-sm font-medium", msg?.kind === "err" ? "text-signal" : "text-ok")}>{msg?.text}</p>
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="text-left text-ink-soft">
            <th className="px-5 py-3 font-medium">Pengguna</th><th className="px-3 py-3 font-medium">Role</th>
            <th className="px-3 py-3 font-medium">Divisi</th><th className="px-3 py-3 font-medium">Aktif</th><th className="px-5 py-3" />
          </tr></thead>
          <tbody>
            {rows.map((u) => {
              const v = { ...u, ...draft[u.id] };
              const dirty = !!draft[u.id];
              const needsDivision = (v.role_code === "kadiv" || v.role_code === "staff") && !v.division_id;
              return (
                <tr key={u.id} className="border-t border-line align-middle">
                  <td className="px-5 py-3"><p className="font-semibold">{u.full_name || "—"}{u.id === meId && <span className="ml-2 text-xs font-normal text-ink-soft">(Anda)</span>}</p><p className="text-xs text-ink-soft">{u.email}</p></td>
                  <td className="px-3 py-3">
                    <select aria-label={`Role ${u.full_name}`} value={v.role_code} onChange={(e) => set(u.id, { role_code: e.target.value })} className={cx(inputCls, "w-40")}>
                      {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select aria-label={`Divisi ${u.full_name}`} value={v.division_id ?? ""} onChange={(e) => set(u.id, { division_id: e.target.value || null })} className={cx(inputCls, "w-48")} aria-invalid={needsDivision}>
                      <option value="">— Tanpa divisi —</option>
                      {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {needsDivision && <p className="mt-1 text-xs text-amber">Kadiv/Staff perlu divisi agar dapat melihat datanya.</p>}
                  </td>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={v.is_active} onChange={(e) => set(u.id, { is_active: e.target.checked })} aria-label={`Aktif ${u.full_name}`} className="size-4 accent-petrol" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button disabled={!dirty || busy === u.id} onClick={() => save(u)} className={cx(btn.base, btn.primary, "py-1.5")}>{busy === u.id ? "Menyimpan…" : "Simpan"}</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-soft">Tidak ada pengguna yang cocok.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
