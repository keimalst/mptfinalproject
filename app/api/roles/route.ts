import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { ROLE_CODES } from "@/lib/rbac";

/** GET /api/roles — role + izin + katalog izin; ?include=users menambah daftar pengguna (butuh users:manage_roles). */
export async function GET(req: NextRequest) {
  const g = await guard();
  if ("res" in g) return g.res;
  const { supabase, can } = g.ctx;
  const [roles, perms, rp] = await Promise.all([
    supabase.from("roles").select("code,name,description,rank").order("rank"),
    supabase.from("permissions").select("code,group_name,description").order("group_name").order("code"),
    supabase.from("role_permissions").select("role_code,permission_code"),
  ]);
  const err = roles.error ?? perms.error ?? rp.error;
  if (err) return pgError(err);
  const body: Record<string, unknown> = {
    roles: (roles.data ?? []).map((r) => ({ ...r, permissions: (rp.data ?? []).filter((x) => x.role_code === r.code).map((x) => x.permission_code) })),
    permissions: perms.data ?? [],
  };
  if (req.nextUrl.searchParams.get("include") === "users") {
    if (!can("users:manage_roles")) return jsonError(403, "Role Anda tidak berwenang melihat daftar pengguna.");
    const users = await supabase.from("profiles").select("id,full_name,email,role_code,division_id,is_active").order("full_name");
    if (users.error) return pgError(users.error);
    body.users = users.data;
  }
  return NextResponse.json(body);
}

/** PATCH /api/roles — ubah role/divisi/status aktif seorang pengguna. Body: {user_id, role_code?, division_id?, is_active?} */
export async function PATCH(req: NextRequest) {
  const g = await guard("users:manage_roles");
  if ("res" in g) return g.res;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.user_id !== "string") return jsonError(400, "user_id wajib diisi.");
  const patch: Record<string, unknown> = {};
  if ("role_code" in body) {
    if (!ROLE_CODES.includes(body.role_code)) return jsonError(400, "role_code tidak valid.");
    patch.role_code = body.role_code;
  }
  if ("division_id" in body) patch.division_id = body.division_id || null;
  if ("is_active" in body) patch.is_active = Boolean(body.is_active);
  if (!Object.keys(patch).length) return jsonError(400, "Tidak ada perubahan.");
  const { data, error } = await g.ctx.supabase.from("profiles").update(patch).eq("id", body.user_id)
    .select("id,full_name,email,role_code,division_id,is_active").maybeSingle();
  if (error) return pgError(error);
  if (!data) return jsonError(404, "Pengguna tidak ditemukan.");
  return NextResponse.json({ user: data });
}
