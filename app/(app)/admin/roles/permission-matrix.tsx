"use client";

import { Fragment, useState } from "react";
import { btn, cx, Panel } from "@/components/ui";

const LOCKED = new Set(["users:manage_roles", "roles:manage_permissions"]);

export function PermissionMatrix({ roles, permissions, initial }: {
  roles: { code: string; name: string }[];
  permissions: { code: string; group_name: string; description: string }[];
  initial: Record<string, string[]>;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = (code: string) => [...draft[code]].sort().join() !== [...saved[code]].sort().join();
  const toggle = (role: string, perm: string) =>
    setDraft((d) => ({ ...d, [role]: d[role].includes(perm) ? d[role].filter((p) => p !== perm) : [...d[role], perm] }));

  async function save(role: { code: string; name: string }) {
    setBusy(role.code); setMsg(null);
    const res = await fetch(`/api/roles/${role.code}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissions: draft[role.code] }) });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: body.error ?? "Gagal menyimpan." });
    setSaved((s) => ({ ...s, [role.code]: draft[role.code] }));
    setMsg({ ok: true, text: `Izin role ${role.name} disimpan.` });
  }

  const groups = [...new Set(permissions.map((p) => p.group_name))];
  return (
    <div className="space-y-4">
      <p role="status" aria-live="polite" className={cx("min-h-5 text-sm font-medium", msg?.ok ? "text-ok" : "text-signal")}>{msg?.text}</p>
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-ink-soft">
              <th className="px-5 py-3 font-medium">Izin</th>
              {roles.map((r) => <th key={r.code} className="px-3 py-3 text-center font-medium">{r.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr className="border-t border-line bg-paper"><th colSpan={roles.length + 1} className="px-5 py-2 text-left font-display text-sm font-semibold">{g}</th></tr>
                {permissions.filter((p) => p.group_name === g).map((p) => (
                  <tr key={p.code} className="border-t border-line">
                    <td className="px-5 py-2.5"><p>{p.description}</p><p className="font-mono text-xs text-ink-soft">{p.code}</p></td>
                    {roles.map((r) => {
                      const locked = r.code === "admin" && LOCKED.has(p.code);
                      return (
                        <td key={r.code} className="px-3 py-2.5 text-center">
                          <input type="checkbox" className="size-4 accent-petrol" checked={draft[r.code].includes(p.code)} disabled={locked}
                            onChange={() => toggle(r.code, p.code)} aria-label={`${r.name}: ${p.description}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="border-t border-line">
              <td className="px-5 py-3 text-ink-soft">Simpan perubahan per role</td>
              {roles.map((r) => (
                <td key={r.code} className="px-3 py-3 text-center">
                  <button disabled={!dirty(r.code) || busy === r.code} onClick={() => save(r)} className={cx(btn.base, btn.primary, "px-3 py-1.5")}>{busy === r.code ? "…" : "Simpan"}</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
