import { requirePermission } from "@/lib/auth/dal";
import { getDashboard } from "@/lib/dashboard";
import { PageHeader } from "@/components/ui";
import { DashboardView } from "./dashboard-view";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requirePermission("dashboard:view_all", "dashboard:view_division");
  const r = await getDashboard(ctx);
  if ("error" in r) throw new Error(r.error.message);
  const scopeText = r.data.scope === "all" ? "Progres seluruh divisi berdasarkan skor IPMS." : "Progres divisi Anda berdasarkan skor IPMS.";
  return (
    <>
      <PageHeader title="Dashboard Progres" description={scopeText} />
      <DashboardView initial={r.data} />
    </>
  );
}
