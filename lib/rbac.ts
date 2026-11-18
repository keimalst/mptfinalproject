export const ROLE_CODES = ["admin", "pembina", "ketua", "kadiv", "staff"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export type PermissionCode =
  | "users:read" | "users:manage_roles" | "roles:manage_permissions"
  | "divisions:read" | "divisions:manage"
  | "dashboard:view_all" | "dashboard:view_division"
  | "tasks:read_all" | "tasks:read_division" | "tasks:read_own"
  | "documents:create" | "documents:read_all" | "documents:read_division"
  | "documents:review" | "documents:approve";

type Rule = { prefix: string; any: PermissionCode[] };

/**
 * Aturan akses per route (halaman & API). Urutan penting: yang paling spesifik lebih dulu.
 * Dipakai oleh proxy.ts (403 cepat) dan navigasi sidebar (conditional rendering).
 * Penegakan sesungguhnya tetap di database (RLS) dan di tiap Route Handler.
 */
export const ROUTE_RULES: Rule[] = [
  { prefix: "/dashboard", any: ["dashboard:view_all", "dashboard:view_division"] },
  { prefix: "/api/dashboard", any: ["dashboard:view_all", "dashboard:view_division"] },
  { prefix: "/documents/new", any: ["documents:create"] },
  { prefix: "/documents", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { prefix: "/api/documents", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { prefix: "/admin/users", any: ["users:manage_roles"] },
  { prefix: "/admin/roles", any: ["roles:manage_permissions"] },
];

export function matchRule(pathname: string): Rule | undefined {
  return ROUTE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
}

export function hasAny(perms: ReadonlySet<string> | readonly string[], needed: readonly string[]) {
  const set = perms instanceof Set ? perms : new Set(perms);
  return needed.some((p) => set.has(p));
}

export type NavItem = { href: string; label: string; any: PermissionCode[] };
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", any: ["dashboard:view_all", "dashboard:view_division"] },
  { href: "/documents", label: "Persuratan", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { href: "/admin/users", label: "Pengguna & Role", any: ["users:manage_roles"] },
  { href: "/admin/roles", label: "Matriks Hak Akses", any: ["roles:manage_permissions"] },
  { href: "/akun", label: "Akun Saya", any: [] },
];

export function homeFor(perms: ReadonlySet<string>) {
  return hasAny(perms, ["dashboard:view_all", "dashboard:view_division"]) ? "/dashboard" : "/akun";
}
