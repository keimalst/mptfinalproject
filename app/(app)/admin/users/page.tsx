import { requirePermission } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui";
import { UsersTable } from "./users-table";

export const metadata = { title: "Pengguna & Role" };

export default async function UsersPage() {
  const ctx = await requirePermission("users:manage_roles");
  const [users, roles, divisions] = await Promise.all([
    ctx.supabase.from("profiles").select("id,full_name,email,role_code,division_id,is_active").order("full_name"),
    ctx.supabase.from("roles").select("code,name").order("rank"),
    ctx.supabase.from("divisions").select("id,name").order("sort_order"),
  ]);
  const err = users.error ?? roles.error ?? divisions.error;
  if (err) throw new Error(err.message);
  return (
    <>
      <PageHeader title="Pengguna & Role" description="Ubah role, divisi, dan status aktif pengguna. Perubahan berlaku seketika karena ditegakkan di database (RLS). Akun baru dibuat lewat Supabase Auth dan otomatis berstatus Staff." />
      <UsersTable initialUsers={users.data ?? []} roles={roles.data ?? []} divisions={divisions.data ?? []} meId={ctx.profile.id} />
    </>
  );
}
