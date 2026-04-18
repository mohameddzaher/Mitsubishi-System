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
import { SLA_MINUTES } from "@/config/constants";

export const dynamic = "force-dynamic";

const RESOLUTION_TARGETS = [
  { key: "sla_resolution_critical_hours", label: "Critical incident resolution", def: 4, suffix: "hours" },
  { key: "sla_resolution_high_hours", label: "High priority resolution", def: 12, suffix: "hours" },
  { key: "sla_resolution_medium_hours", label: "Medium priority resolution", def: 24, suffix: "hours" },
  { key: "sla_resolution_low_hours", label: "Low priority resolution", def: 72, suffix: "hours" },
  { key: "sla_dispute_investigation_hours", label: "Dispute investigation", def: 48, suffix: "hours" },
  { key: "sla_collection_first_contact_days", label: "Collection first contact (post-due)", def: 7, suffix: "days" },
];

export default async function SlaPage() {
  const session = await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_SERVICE,
    UserRole.HEAD_OF_QUALITY,
  ]);
  await connectDB();

  const settings = await Setting.find({
    $or: [{ scope: "branch", scopeId: session.user.branchId }, { scope: "global" }],
  }).lean();
  const map = new Map(settings.map((s) => [s.key, s.value as number]));

  async function saveAll(formData: FormData) {
    "use server";
    for (const k of RESOLUTION_TARGETS) {
      const raw = formData.get(k.key);
      if (raw === null) continue;
      const val = Number(raw);
      if (Number.isFinite(val)) await updateSetting(k.key, val, "branch");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="SLA definitions" description="Service-level response and resolution targets" />

      <Card>
        <CardHeader>
          <CardTitle>Response time SLA</CardTitle>
          <CardDescription>Minutes from incident report to technician on-site</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(SLA_MINUTES).map(([priority, mins]) => (
            <div key={priority} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
              <div className="flex items-center justify-between">
                <Badge variant={priority === "emergency" || priority === "critical" ? "danger" : priority === "high" ? "warning" : "info"}>
                  {priority}
                </Badge>
                <span className="font-mono text-sm font-semibold">{mins} min</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <form action={saveAll} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Resolution time targets</CardTitle>
            <CardDescription>Editable — how long to fully resolve an incident / investigation</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {RESOLUTION_TARGETS.map((t) => {
              const value = (map.get(t.key) ?? t.def) as number;
              return (
                <div key={t.key}>
                  <label htmlFor={t.key} className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                    {t.label}
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input type="number" id={t.key} name={t.key} defaultValue={value} step="1" min="0" className="flex-1 font-mono" />
                    <span className="text-xs text-[var(--color-text-muted)]">{t.suffix}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Button type="submit">Save SLA targets</Button>
        </div>
      </form>
    </div>
  );
}
