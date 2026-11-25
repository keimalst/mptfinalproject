import { requirePermission } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui";
import { PengawasanView, type AuditRow, type DirectiveRow } from "./pengawasan-view";

export const metadata = { title: "Pengawasan & Arahan Pembina" };

export default async function PengawasanPage() {
  const ctx = await requirePermission("audit:read", "directives:read", "directives:create", "directives:resolve");

  const canAudit = ctx.can("audit:read");
  const canReadDirectives = ctx.can("directives:read", "directives:create", "directives:resolve");

  const [auditRes, dirRes] = await Promise.all([
    canAudit
      ? ctx.supabase
          .from("audit_logs")
          .select("id,entity_type,entity_id,action,summary,metadata,created_at,actor:profiles!actor_id(full_name,role_code),division:divisions(name)")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    canReadDirectives
      ? ctx.supabase
          .from("strategic_directives")
          .select("id,title,content,priority,status,created_by,acknowledged_at,resolved_at,resolution_note,created_at,updated_at,author:profiles!created_by(full_name)")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (auditRes.error) throw new Error(auditRes.error.message);
  if (dirRes.error) throw new Error(dirRes.error.message);

  const rawAudits = (auditRes.data ?? []) as unknown as Array<Omit<AuditRow, "actor" | "division"> & {
    actor: { full_name: string; role_code: string } | { full_name: string; role_code: string }[] | null;
    division: { name: string } | { name: string }[] | null;
  }>;

  const audits: AuditRow[] = rawAudits.map((a) => ({
    ...a,
    actor: Array.isArray(a.actor) ? (a.actor[0] ?? null) : a.actor,
    division: Array.isArray(a.division) ? (a.division[0] ?? null) : a.division,
  }));

  const rawDirs = (dirRes.data ?? []) as unknown as Array<Omit<DirectiveRow, "author"> & {
    author: { full_name: string } | { full_name: string }[] | null;
  }>;

  const directives: DirectiveRow[] = rawDirs.map((d) => ({
    ...d,
    author: Array.isArray(d.author) ? (d.author[0] ?? null) : d.author,
  }));

  return (
    <>
      <PageHeader
        title="Pengawasan & Arahan Strategis"
        description="Rekam jejak persetujuan dokumen, aktivitas lintas peran, dan catatan arahan strategis Pembina kepada Ketua Pelaksana."
      />
      <PengawasanView
        initialAudits={audits}
        initialDirectives={directives}
        permissions={{
          canAudit,
          canCreateDirective: ctx.can("directives:create"),
          canResolveDirective: ctx.can("directives:resolve"),
        }}
      />
    </>
  );
}
