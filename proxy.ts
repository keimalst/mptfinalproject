import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { loadProfile } from "@/lib/auth/profile";
import { hasAny, homeFor, matchRule } from "@/lib/rbac";

const PUBLIC_PATHS = ["/login", "/forbidden"];

/**
 * Proxy (dulu "middleware") — Next.js 16:
 *  1. refresh sesi Supabase (@supabase/ssr)
 *  2. belum login  -> /login (halaman) atau 401 (API)
 *  3. role tidak sesuai -> 403 (halaman dirender sebagai /forbidden dengan status 403, API JSON 403)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Salin cookie sesi yang baru ke respons apa pun yang kita kembalikan.
  const finish = (res: NextResponse) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };
  const redirectTo = (path: string, search?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search ?? "";
    return finish(NextResponse.redirect(url));
  };

  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;

  if (!uid) {
    if (PUBLIC_PATHS.includes(pathname)) return response;
    if (isApi) return finish(NextResponse.json({ error: "Belum login." }, { status: 401 }));
    return redirectTo("/login", pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`);
  }

  if (pathname === "/forbidden") return response;
  const rule = matchRule(pathname);
  if (pathname !== "/" && pathname !== "/login" && !rule) return response; // tak perlu cek izin

  const profile = await loadProfile(supabase, uid);
  if (!profile || !profile.isActive) {
    await supabase.auth.signOut();
    if (isApi) return finish(NextResponse.json({ error: "Akun tidak aktif." }, { status: 403 }));
    return redirectTo("/login", "?error=inactive");
  }

  const perms = new Set(profile.permissions);
  if (pathname === "/" || pathname === "/login") return redirectTo(homeFor(perms));

  if (rule && !hasAny(perms, rule.any)) {
    if (isApi) return finish(NextResponse.json({ error: "Role Anda tidak berwenang mengakses sumber daya ini." }, { status: 403 }));
    const url = request.nextUrl.clone();
    url.pathname = "/forbidden";
    return finish(NextResponse.rewrite(url, { status: 403 }));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
