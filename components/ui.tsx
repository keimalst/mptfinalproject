import type { ReactNode } from "react";
import { STATUS_META, type DocStatus } from "@/lib/documents/shared";

export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  primary: "bg-petrol text-white hover:bg-petrol-deep",
  secondary: "border border-line bg-card text-ink hover:bg-petrol-wash",
  danger: "bg-signal text-white hover:bg-[#a22f23]",
  ghost: "text-ink-soft hover:bg-petrol-wash hover:text-ink",
};
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const inputCls =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-petrol aria-[invalid=true]:border-signal";

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-signal">{error}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-line/60 text-ink-soft",
  info: "bg-petrol-wash text-petrol-deep",
  warn: "bg-amber-wash text-amber",
  ok: "bg-ok-wash text-ok",
  bad: "bg-signal-wash text-signal",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-[3px] px-2 py-0.5 text-xs font-semibold", TONES[tone])}>{children}</span>;
}
export function StatusBadge({ status }: { status: DocStatus }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-lg border border-line bg-card", className)}>{children}</section>;
}
