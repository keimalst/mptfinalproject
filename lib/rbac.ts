export const ROLE_CODES = ["admin", "pembina", "ketua", "kadiv", "staff"] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export type PermissionCode =
  | "users:read" | "users:manage_roles" | "roles:manage_permissions"
  | "divisions:read" | "divisions:manage"
  | "dashboard:view_all" | "dashboard:view_division"
  | "tasks:read_all" | "tasks:read_division" | "tasks:read_own"
  | "tasks:create" | "tasks:update_all" | "tasks:update_division" | "tasks:update_own"
  | "documents:create" | "documents:read_all" | "documents:read_division"
  | "documents:review" | "documents:approve"
  | "audit:read" | "directives:create" | "directives:read" | "directives:resolve"
  | "workload:read_all" | "workload:read_division";

type Rule = { prefix: string; any: PermissionCode[] };

/**
 * Aturan akses per route (halaman & API). Urutan penting: yang paling spesifik lebih dulu.
 * Dipakai oleh proxy.ts (403 cepat) dan navigasi sidebar (conditional rendering).
 * Penegakan sesungguhnya tetap di database (RLS) dan di tiap Route Handler.
 */
export const ROUTE_RULES: Rule[] = [
  { prefix: "/dashboard", any: ["dashboard:view_all", "dashboard:view_division"] },
  { prefix: "/api/dashboard", any: ["dashboard:view_all", "dashboard:view_division"] },
  { prefix: "/pengawasan", any: ["audit:read", "directives:read", "directives:create", "directives:resolve"] },
  { prefix: "/api/audit-logs", any: ["audit:read"] },
  { prefix: "/api/directives", any: ["directives:read", "directives:create", "directives:resolve"] },
  { prefix: "/documents/new", any: ["documents:create"] },
  { prefix: "/documents", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { prefix: "/api/documents", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { prefix: "/api/workload", any: ["workload:read_all", "workload:read_division"] },
  { prefix: "/api/tasks", any: ["tasks:read_all", "tasks:read_division", "tasks:read_own", "tasks:create"] },
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
  { href: "/pengawasan", label: "Pengawasan", any: ["audit:read", "directives:read", "directives:create", "directives:resolve"] },
  { href: "/documents", label: "Persuratan", any: ["documents:read_all", "documents:read_division", "documents:create"] },
  { href: "/admin/users", label: "Pengguna & Role", any: ["users:manage_roles"] },
  { href: "/admin/roles", label: "Matriks Hak Akses", any: ["roles:manage_permissions"] },
  { href: "/akun", label: "Akun Saya", any: [] },
];

export function homeFor(perms: ReadonlySet<string>) {
  return hasAny(perms, ["dashboard:view_all", "dashboard:view_division"]) ? "/dashboard" : "/akun";
}
