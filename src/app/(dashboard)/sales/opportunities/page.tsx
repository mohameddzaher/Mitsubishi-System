import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Opportunity } from "@/models";
import { scopedFilter } from "@/server/filters";
import { OPPORTUNITY_STAGES } from "@/models/Opportunity";
import { TrendingUp, Target, DollarSign, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_survey: "Site survey",
  quotation_prepared: "Quote prepared",
  quotation_sent: "Quote sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  on_hold: "On hold",
};

const STAGE_COLORS: Record<string, string> = {
  new: "var(--color-info)",
  contacted: "var(--color-chart-5)",
  qualified: "var(--color-chart-6)",
  site_survey: "var(--color-chart-3)",
  quotation_prepared: "var(--color-chart-3)",
  quotation_sent: "var(--color-warning)",
  negotiation: "var(--color-warning)",
  won: "var(--color-success)",
  lost: "var(--color-danger)",
  on_hold: "var(--color-text-muted)",
};

export default async function SalesPipelinePage() {
  const session = await requireSession();
  await connectDB();

  const opps = await Opportunity.find(scopedFilter(session, { deletedAt: null }))
    .populate("customerId", "commercialName code")
    .populate("ownerId", "firstName lastName")
    .sort({ expectedCloseDate: 1 })
    .lean();

  const byStage = new Map<string, typeof opps>();
  for (const o of opps) {
    const list = byStage.get(o.stage) ?? [];
    list.push(o);
    byStage.set(o.stage, list);
  }

  const totalValue = opps.reduce((a, o) => a + (o.value ?? 0), 0);
  const weightedValue = opps.reduce((a, o) => a + ((o.value ?? 0) * (o.probability ?? 0)) / 100, 0);
  const wonThisMonth = opps.filter((o) => o.stage === "won");
  const wonValue = wonThisMonth.reduce((a, o) => a + (o.value ?? 0), 0);

  const activeStages = OPPORTUNITY_STAGES.filter((s) => s !== "won" && s !== "lost" && s !== "on_hold");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales pipeline"
        description={`${opps.length} opportunities across ${activeStages.length} active stages`}
        actions={
          <Button asChild>
            <Link href="/sales/opportunities/new">+ New opportunity</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total pipeline" value={formatCurrency(totalValue)} hint={`${opps.length} open deals`} icon={<DollarSign className="size-4" />} accent="info" />
        <KpiCard label="Weighted forecast" value={formatCurrency(weightedValue)} icon={<Target className="size-4" />} accent="warning" />
        <KpiCard label="Won deals" value={wonThisMonth.length} hint={formatCurrency(wonValue)} icon={<Award className="size-4" />} accent="success" />
        <KpiCard label="Avg deal size" value={formatCurrency(opps.length ? totalValue / opps.length : 0)} icon={<TrendingUp className="size-4" />} />
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {activeStages.map((stage) => {
          const stageOpps = byStage.get(stage) ?? [];
          const stageTotal = stageOpps.reduce((a, o) => a + (o.value ?? 0), 0);
          return (
            <div key={stage} className="w-[260px] shrink-0">
              <div className="sticky top-0 z-10 mb-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <span className="rounded-sm bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">
                    {stageOpps.length}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                  {formatCurrency(stageTotal)}
                </div>
              </div>
              <div className="space-y-2">
                {stageOpps.map((o) => {
                  const c = o.customerId as unknown as { commercialName?: string; code?: string } | null;
                  const owner = o.ownerId as unknown as { firstName?: string; lastName?: string } | null;
                  return (
                    <Card key={String(o._id)}>
                      <CardContent className="p-2.5">
                        <Link href={`/customers/${String(c?.["_id" as keyof typeof c] ?? "")}`} className="block">
                          <div className="mb-1 line-clamp-2 text-[12px] font-medium">{o.title}</div>
                          <div className="mb-1.5 text-[10px] text-[var(--color-text-muted)]">{c?.commercialName}</div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                              {formatCurrency(o.value)}
                            </span>
                            <Badge variant="outline">{o.probability}%</Badge>
                          </div>
                          {owner && (
                            <div className="mt-1.5 border-t border-[var(--color-border-subtle)] pt-1.5 text-[9px] text-[var(--color-text-muted)]">
                              {owner.firstName} {owner.lastName}
                            </div>
                          )}
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
                {stageOpps.length === 0 && (
                  <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-3 text-center text-[10px] text-[var(--color-text-muted)]">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
