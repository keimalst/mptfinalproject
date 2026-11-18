import { requireAuth } from "@/lib/auth/dal";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const metadata = { title: "Akun Saya" };

export default async function AccountPage() {
  const { supabase, profile } = await requireAuth();
  const [perms, division] = await Promise.all([
    supabase.from("permissions").select("code,group_name,description").in("code", profile.permissions.length ? profile.permissions : ["-"]).order("group_name"),
    profile.divisionId ? supabase.from("divisions").select("name").eq("id", profile.divisionId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const groups = new Map<string, { code: string; description: string }[]>();
  perms.data?.forEach((p) => groups.set(p.group_name, [...(groups.get(p.group_name) ?? []), p]));

  return (
    <>
      <PageHeader title="Akun Saya" description="Ringkasan identitas dan hak akses role Anda." />
      <Panel className="mb-6 grid gap-5 p-6 sm:grid-cols-3">
        <div><p className="text-sm text-ink-soft">Nama</p><p className="font-semibold">{profile.fullName || "—"}</p></div>
        <div><p className="text-sm text-ink-soft">Email</p><p className="break-all font-semibold">{profile.email}</p></div>
        <div>
          <p className="text-sm text-ink-soft">Role & divisi</p>
          <p className="font-semibold">{profile.roleName}{division.data ? ` · ${division.data.name}` : ""}</p>
        </div>
      </Panel>
      <h2 className="mb-3 text-lg font-semibold">Hak akses role Anda</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...groups].map(([group, list]) => (
          <Panel key={group} className="p-5">
            <h3 className="mb-2 font-semibold">{group}</h3>
            <ul className="space-y-1.5 text-sm text-ink-soft">
              {list.map((p) => <li key={p.code}>{p.description}</li>)}
            </ul>
          </Panel>
        ))}
        {groups.size === 0 && <Badge>Belum ada izin</Badge>}
      </div>
    </>
  );
}
