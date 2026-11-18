import "server-only";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAuth, type AuthContext } from "@/lib/auth/dal";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** 401 bila belum login, 403 bila tidak punya satupun izin yang dibutuhkan. */
export async function guard(...any: string[]): Promise<{ ctx: AuthContext } | { res: NextResponse }> {
  const ctx = await getAuth();
  if (!ctx) return { res: jsonError(401, "Belum login.") };
  if (any.length && !ctx.can(...any)) return { res: jsonError(403, "Role Anda tidak berwenang mengakses sumber daya ini.") };
  return { ctx };
}

const PG_STATUS: Record<string, number> = {
  "28000": 401, "42501": 403, P0002: 404, "22023": 409, "23514": 422, "23505": 409, "23503": 409,
};

export function pgError(error: PostgrestError) {
  const status = PG_STATUS[error.code] ?? 500;
  const message = status === 500 ? "Terjadi kesalahan pada server." : error.message;
  if (status === 500) console.error("[supabase]", error);
  return jsonError(status, message);
}
