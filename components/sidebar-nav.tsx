"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function SidebarNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const active = pathname === i.href || pathname.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cx("whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-petrol text-white" : "text-[#b4cacc] hover:bg-white/10 hover:text-white")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
