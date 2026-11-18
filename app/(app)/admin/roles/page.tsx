import { requirePermission } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui";
import { PermissionMatrix } from "./permission-matrix";

export const metadata = { title: "Matriks Hak Akses" };

export default async function RolesPage() {
  const ctx = await requirePermission("roles:manage_permissions");
  const [roles, perms, rp] = await Promise.all([
    ctx.supabase.from("roles").select("code,name").order("rank"),
    ctx.supabase.from("permissions").select("code,group_name,description").order("group_name").order("code"),
    ctx.supabase.from("role_permissions").select("role_code,permission_code"),
  ]);
  const err = roles.error ?? perms.error ?? rp.error;
  if (err) throw new Error(err.message);
  const roleRows = roles.data ?? [];
  const matrix: Record<string, string[]> = {};
  roleRows.forEach((r) => (matrix[r.code] = (rp.data ?? []).filter((x) => x.role_code === r.code).map((x) => x.permission_code)));
  return (
    <>
      <PageHeader title="Matriks Hak Akses" description="Atur izin tiap role. Izin mengelola pengguna dan hak akses pada role Admin dikunci agar sistem tidak terkunci." />
      <PermissionMatrix roles={roleRows} permissions={perms.data ?? []} initial={matrix} />
    </>
  );
}
