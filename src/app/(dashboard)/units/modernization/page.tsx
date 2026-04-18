import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit, WorkOrder } from "@/models";
import { scopedFilter } from "@/server/filters";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { HorizontalBar } from "@/components/charts/sparkline";
import { Wrench, TrendingUp, AlertCircle, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ModernizationPage() {
  const session = await requireSession();
  await connectDB();

  const now = new Date();
  const units = await Unit.find(scopedFilter(session, { deletedAt: null, installedAt: { $exists: true } }))
    .populate("customerId", "commercialName code")
    .lean();

  // Compute age + attach failure count per unit
  const failureCounts = await WorkOrder.aggregate([
    { $match: scopedFilter(session, { type: { $in: ["corrective", "emergency"] }, deletedAt: null }) },
    { $group: { _id: "$unitId", failures: { $sum: 1 } } },
  ]);
  const failMap = new Map(failureCounts.map((f) => [String(f._id), f.failures as number]));

  const withAge = units.map((u) => {
    const years = u.installedAt ? (now.getTime() - new Date(u.installedAt).getTime()) / (365.25 * 86_400_000) : 0;
    return {
      ...u,
      years: Math.round(years),
      failures: failMap.get(String(u._id)) ?? 0,
    };
  });

  const candidates = withAge
    .filter((u) => u.years >= 15 || u.failures >= 3)
    .sort((a, b) => b.years + b.failures - (a.years + a.failures));

  const ageGroups = [
    { label: "< 5y", count: withAge.filter((u) => u.years < 5).length },
    { label: "5–10y", count: withAge.filter((u) => u.years >= 5 && u.years < 10).length },
    { label: "10–15y", count: withAge.filter((u) => u.years >= 10 && u.years < 15).length },
    { label: "15y+", count: withAge.filter((u) => u.years >= 15).length },
  ];

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/units" className="text-[var(--color-text-muted)]">← All units</Link></div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[var(--color-brand)]" /> Modernization opportunities
          </span>
        }
        description="Older units with high failure rates — prime candidates for modernization proposals"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total fleet" value={withAge.length} icon={<Building2 className="size-4" />} />
        <KpiCard label="15+ years old" value={ageGroups[3]!.count} icon={<Wrench className="size-4" />} accent="warning" />
        <KpiCard label="Candidates (15y+ OR 3+ failures)" value={candidates.length} icon={<AlertCircle className="size-4" />} accent="info" />
        <KpiCard label="Avg fleet age" value={`${Math.round(withAge.reduce((a, u) => a + u.years, 0) / Math.max(withAge.length, 1))}y`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Age distribution</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={ageGroups.map((g) => ({
                label: g.label,
                value: g.count,
                accent: g.label === "15y+" ? "var(--color-danger)" : g.label === "10–15y" ? "var(--color-warning)" : "var(--color-info)",
              }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top modernization candidates</CardTitle>
            <CardDescription>Sorted by age + failure count</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={candidates.slice(0, 50)}
              getKey={(r) => String((r as { _id: unknown })._id)}
              rowHref={(r) => `/units/${String((r as { _id: unknown })._id)}`}
              columns={[
                { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                { key: "model", header: "Model", accessor: (r) => <span className="text-xs">{(r as { model: string }).model}</span> },
                {
                  key: "customer",
                  header: "Customer",
                  accessor: (r) => {
                    const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                    return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
                  },
                },
                {
                  key: "age",
                  header: "Age",
                  align: "right",
                  accessor: (r) => {
                    const y = (r as { years: number }).years;
                    return <Badge variant={y >= 15 ? "danger" : y >= 10 ? "warning" : "info"}>{y}y</Badge>;
                  },
                },
                {
                  key: "fails",
                  header: "Failures",
                  align: "right",
                  accessor: (r) => {
                    const f = (r as { failures: number }).failures;
                    return <span className={`font-mono text-xs ${f >= 3 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>{f}</span>;
                  },
                },
                {
                  key: "installed",
                  header: "Installed",
                  accessor: (r) => <span className="text-[11px]">{(r as { installedAt?: Date }).installedAt ? formatDate((r as { installedAt: Date }).installedAt) : "—"}</span>,
                },
              ]}
              emptyTitle="No modernization candidates"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
