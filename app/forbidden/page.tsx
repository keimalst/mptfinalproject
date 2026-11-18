import Link from "next/link";
import { btn, cx } from "@/components/ui";

export const metadata = { title: "Akses ditolak" };

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-display text-6xl font-semibold text-petrol">403</p>
      <h1 className="mt-3 text-2xl font-semibold">Role Anda tidak memiliki akses ke halaman ini</h1>
      <p className="mt-2 text-ink-soft">Hubungi Admin Sistem bila Anda merasa seharusnya memiliki akses.</p>
      <Link href="/" className={cx(btn.base, btn.primary, "mt-6 self-start")}>Kembali ke beranda</Link>
    </main>
  );
}
