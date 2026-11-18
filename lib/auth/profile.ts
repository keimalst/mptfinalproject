import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoleCode } from "@/lib/rbac";

export type SessionProfile = {
  id: string;
  fullName: string;
  email: string | null;
  roleCode: RoleCode;
  roleName: string;
  divisionId: string | null;
  isActive: boolean;
  permissions: string[];
};

/** Satu query: profil + role + izin. Dipakai proxy.ts dan DAL. */
export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<SessionProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role_code, division_id, is_active, roles(name, role_permissions(permission_code))")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const role = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    roleCode: data.role_code as RoleCode,
    roleName: role?.name ?? data.role_code,
    divisionId: data.division_id,
    isActive: data.is_active,
    permissions: (role?.role_permissions ?? []).map((p: { permission_code: string }) => p.permission_code),
  };
}
