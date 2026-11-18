import { NextResponse, type NextRequest } from "next/server";
import { guard, jsonError, pgError } from "@/lib/api";
import { ROLE_CODES } from "@/lib/rbac";

/** PUT /api/roles/[code]/permissions — ganti seluruh izin sebuah role. Body: {permissions: string[]} */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/roles/[code]/permissions">) {
  const g = await guard("roles:manage_permissions");
  if ("res" in g) return g.res;
  const { code } = await ctx.params;
  if (!(ROLE_CODES as readonly string[]).includes(code)) return jsonError(404, "Role tidak ditemukan.");
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.permissions) || body.permissions.some((p: unknown) => typeof p !== "string"))
    return jsonError(400, "permissions harus berupa array string.");
  const { error } = await g.ctx.supabase.rpc("set_role_permissions", { p_role_code: code, p_permissions: body.permissions });
  if (error) return pgError(error);
  return NextResponse.json({ ok: true, role: code, permissions: body.permissions });
}
