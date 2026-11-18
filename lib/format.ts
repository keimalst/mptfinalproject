const tz = "Asia/Jakarta";
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: tz });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz });

export const fmtDate = (v: string | Date) => dateFmt.format(new Date(v));
export const fmtDateTime = (v: string | Date) => dateTimeFmt.format(new Date(v)) + " WIB";

/** Sisa waktu relatif terhadap `now` (ms). Contoh: "terlambat 2 hari", "3 hari lagi". */
export function dueLabel(due: string | null, now: number) {
  if (!due) return "Tanpa tenggat";
  const diff = new Date(due).getTime() - now;
  const days = Math.round(Math.abs(diff) / 86_400_000);
  const hours = Math.round(Math.abs(diff) / 3_600_000);
  const span = days >= 1 ? `${days} hari` : `${Math.max(1, hours)} jam`;
  return diff < 0 ? `Terlambat ${span}` : `${span} lagi`;
}
