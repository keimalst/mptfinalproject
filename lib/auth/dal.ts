import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAny } from "@/lib/rbac";
import { loadProfile, type SessionProfile } from "./profile";

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: SessionProfile;
  permissions: Set<string>;
  can: (...needed: string[]) => boolean;
};

/** Konteks autentikasi per-request (di-cache). Null bila belum login / nonaktif. */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const profile = await loadProfile(supabase, uid);
  if (!profile || !profile.isActive) return null;
  const permissions = new Set(profile.permissions);
  return { supabase, profile, permissions, can: (...needed) => hasAny(permissions, needed) };
});

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Lapisan kedua setelah proxy.ts: dipanggil dari halaman server. */
export async function requirePermission(...any: string[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!ctx.can(...any)) redirect("/forbidden");
  return ctx;
}
