import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Setting } from "@/models";
import { UserRole } from "@/config/roles";
import { updateSetting } from "@/server/settings/actions";

export const dynamic = "force-dynamic";

type Kpi = { key: string; label: string; suffix: string; def: number; scope: string; description: string };

const KPIs: Kpi[] = [
  { key: "active_ratio_target", label: "Active customer ratio", suffix: "%", def: 40, scope: "Sales", description: "Active customers / (active + pipeline). Alerts trigger below this value." },
  { key: "technician_on_time_target", label: "Technician on-time arrival", suffix: "%", def: 95, scope: "Service", description: "% of visits where technician arrived within 10 minutes of schedule." },
  { key: "emergency_sla_minutes", label: "Emergency response SLA", suffix: "min", def: 60, scope: "Service", description: "Maximum minutes from emergency report to technician arrival." },
  { key: "dso_target_days", label: "Days sales outstanding (DSO)", suffix: "days", def: 45, scope: "Finance", description: "Target average days to collect invoiced amounts." },
  { key: "ftfr_target", label: "First-time fix rate", suffix: "%", def: 85, scope: "Service", description: "% of corrective visits resolved on first attempt." },
  { key: "nps_target", label: "NPS score", suffix: "", def: 50, scope: "CX", description: "Net Promoter Score target." },
  { key: "churn_alert_threshold", label: "Churn alert threshold", suffix: "%", def: 5, scope: "CX", description: "Flag in executive dashboard if monthly churn exceeds this." },
  { key: "contract_renewal_notice_days", label: "Renewal notice window", suffix: "days", def: 60, scope: "Sales", description: "Send renewal reminders this many days before contract end." },
];

export default async function KpiConfigPage() {
  const session = await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.CHAIRMAN,
    UserRole.CEO,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_IT,
  ]);
  await connectDB();

  const settings = await Setting.find({
    $or: [{ scope: "branch", scopeId: session.user.branchId }, { scope: "global" }],
  }).lean();
  const map = new Map(settings.map((s) => [s.key, s.value as number]));

  async function saveAll(formData: FormData) {
    "use server";
    for (const k of KPIs) {
      const raw = formData.get(k.key);
      if (raw === null) continue;
      const val = Number(raw);
      if (Number.isFinite(val)) await updateSetting(k.key, val, "branch");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="KPI targets" description="Thresholds that power dashboards and alerts" />
      <form action={saveAll} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {KPIs.map((kpi) => {
            const value = (map.get(kpi.key) ?? kpi.def) as number;
            return (
              <Card key={kpi.key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{kpi.label}</span>
                    <Badge variant="outline">{kpi.scope}</Badge>
                  </CardTitle>
                  <CardDescription>{kpi.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input type="number" name={kpi.key} defaultValue={value} step="0.1" className="flex-1 font-mono" />
                    <span className="text-xs text-[var(--color-text-muted)]">{kpi.suffix}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">Default: {kpi.def}{kpi.suffix}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex items-center justify-end">
          <Button type="submit">Save all targets</Button>
        </div>
      </form>
    </div>
  );
}
