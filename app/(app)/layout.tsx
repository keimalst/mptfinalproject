import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/dal";
import { NAV_ITEMS } from "@/lib/rbac";
import { signOut } from "@/app/login/actions";
import { SidebarNav } from "@/components/sidebar-nav";
import { Badge } from "@/components/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: ReactNode }) {
  const { profile, can } = await requireAuth();
  const items = NAV_ITEMS.filter((i) => i.any.length === 0 || can(...i.any));
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 bg-sidebar px-4 py-4 lg:w-60 lg:gap-8 lg:py-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-white">CENTRA</Link>
        <SidebarNav items={items} />
        <div className="mt-auto hidden border-t border-white/10 pt-4 lg:block">
          <p className="truncate text-sm font-semibold text-white">{profile.fullName || profile.email}</p>
          <p className="mb-3 text-xs text-[#9fb8bb]">{profile.roleName}</p>
          <form action={signOut}>
            <button className="text-sm text-[#b4cacc] underline-offset-4 hover:text-white hover:underline">Keluar</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-card px-5 py-2.5 lg:hidden">
          <Badge tone="info">{profile.roleName}</Badge>
          <form action={signOut}><button className="text-sm font-medium text-ink-soft">Keluar</button></form>
        </header>
        <main className="mx-auto w-full max-w-6xl px-5 py-7 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
