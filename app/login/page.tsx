import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const ROLES = ["Admin", "Pembina", "Ketua", "Kadiv", "Staff"];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <p className="font-display text-3xl font-semibold tracking-tight">CENTRA</p>
        <div>
          <svg viewBox="0 0 420 260" className="mb-10 w-full max-w-md" role="img" aria-label="Bagan hierarki lima role CENTRA">
            <g stroke="#3d6b70" strokeWidth="1.5" fill="none">
              <path d="M210 44v30M210 74H70M210 74h140M70 74v30M350 74v30M210 74v30" />
              <path d="M70 140v34M210 140v34M350 140v34M70 174h280" />
              <path d="M210 174v30" />
            </g>
            {[["Admin", 210, 28, "#0b6b63"], ["Pembina", 70, 122, "#14464b"], ["Ketua", 210, 122, "#14464b"], ["Kadiv", 350, 122, "#14464b"], ["Staff", 210, 222, "#14464b"]].map(([n, x, y, f]) => (
              <g key={String(n)}>
                <rect x={Number(x) - 52} y={Number(y) - 18} width="104" height="36" rx="6" fill={String(f)} stroke="#3d6b70" />
                <text x={Number(x)} y={Number(y) + 5} textAnchor="middle" fill="#e6f1ef" fontSize="14" fontWeight="600">{n}</text>
              </g>
            ))}
          </svg>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Satu pusat kendali untuk seluruh kepanitiaan.</h1>
          <p className="mt-4 max-w-md text-[#9fb8bb]">Hak akses jelas, progres divisi terukur lewat IPMS, dan surat birokrasi terlacak dari draft hingga persetujuan.</p>
        </div>
        <p className="text-sm text-[#7f9ea2]">{ROLES.join(" · ")}</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="font-display text-2xl font-semibold text-petrol lg:hidden">CENTRA</p>
          <h2 className="mt-1 text-2xl font-semibold lg:mt-0">Masuk ke akun Anda</h2>
          <p className="mb-7 mt-1 text-sm text-ink-soft">Akun dibuat oleh Admin Sistem.</p>
          <Suspense fallback={null}><LoginForm /></Suspense>
        </div>
      </section>
    </main>
  );
}
