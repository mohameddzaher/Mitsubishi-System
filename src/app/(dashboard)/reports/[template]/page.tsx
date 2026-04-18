import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { HorizontalBar, BarChart, Donut } from "@/components/charts/sparkline";
import { Badge } from "@/components/ui/badge";
import {
  getSalesReport,
  getServiceReport,
  getFinanceReport,
  getCollectionReport,
  getCustomerHealthReport,
  getExecutiveReport,
} from "@/lib/kpi/reports";
import { formatCurrency, formatPercent, formatDate, formatCompactNumber } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wrench,
  Coins,
  Users,
  Receipt,
  Star,
  AlertTriangle,
  Award,
  Target,
  Clock,
  Zap,
  Heart,
  DollarSign,
  Activity,
  Siren,
  Package,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

const REPORT_META: Record<string, { title: string; description: string; icon: string }> = {
  sales: { title: "Sales performance", description: "Pipeline, win rate, forecast, quota attainment, leaderboards, loss analysis", icon: "TrendingUp" },
  service: { title: "Service operations", description: "Completion, FTFR, duration variance, emergencies, tech performance & bench", icon: "Wrench" },
  finance: { title: "Financial", description: "Revenue breakdown, VAT, YoY growth, top customers, invoice status, billing mix", icon: "Coins" },
  collection: { title: "Collection & AR", description: "DSO, aging, officer performance, collection trend, PTP hit rate", icon: "Receipt" },
  customers: { title: "Customer intelligence", description: "Health score, segmentation, risk, LTV, churn, acquisition", icon: "Users" },
  executive: { title: "Executive briefing", description: "One-page board summary — every KPI across every function", icon: "FileText" },
};

export default async function ReportTemplatePage({ params }: { params: Promise<{ template: string }> }) {
  const session = await requireSession();
  const { template } = await params;

  const meta = REPORT_META[template];
  if (!meta) notFound();

  const ctx = {
    userId: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/reports" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All reports
        </Link>
      </div>

      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={<ReportActions template={template} />}
      />

      {template === "sales" && <SalesReport ctx={ctx} />}
      {template === "service" && <ServiceReport ctx={ctx} />}
      {template === "finance" && <FinanceReport ctx={ctx} />}
      {template === "collection" && <CollectionReport ctx={ctx} />}
      {template === "customers" && <CustomerReport ctx={ctx} />}
      {template === "executive" && <ExecutiveReport ctx={ctx} />}
    </div>
  );
}

type Ctx = Parameters<typeof getSalesReport>[0];

async function SalesReport({ ctx }: { ctx: Ctx }) {
  const r = await getSalesReport(ctx);

  const activeStages = ["new", "contacted", "qualified", "site_survey", "quotation_prepared", "quotation_sent", "negotiation"];
  const funnelData = activeStages.map((s) => ({
    label: s.replace("_", " "),
    value: r.pipelineFunnel.find((x) => x._id === s)?.count ?? 0,
  }));

  // Monthly trend: combine won vs lost per month
  const months = new Map<string, { won: number; lost: number; wonValue: number }>();
  (r.monthlyTrend ?? []).forEach((e) => {
    const key = `${e._id.y}-${String(e._id.m).padStart(2, "0")}`;
    const cur = months.get(key) ?? { won: 0, lost: 0, wonValue: 0 };
    if (e._id.stage === "won") { cur.won += e.count; cur.wonValue += e.value; }
    else if (e._id.stage === "lost") cur.lost += e.count;
    months.set(key, cur);
  });
  const monthEntries = Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pipeline value" value={formatCurrency(r.totalPipelineValue)} icon={<TrendingUp className="size-4" />} hint="All open opportunities" />
        <KpiCard label="Weighted forecast" value={formatCurrency(r.weightedPipeline)} hint="Value × probability" icon={<Target className="size-4" />} accent="warning" />
        <KpiCard label="Win rate (90d)" value={formatPercent(r.winRate, 1)} hint={`${r.won} won · ${r.lost} lost`} icon={<Award className="size-4" />} accent={r.winRate >= 30 ? "success" : "warning"} />
        <KpiCard label="Avg deal size" value={formatCurrency(r.avgDealSize)} hint={`${r.totalWonDeals} closed-won deals`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Avg sales cycle" value={`${Math.round(r.cycleDaysAvg)} days`} hint="Created → won" icon={<Clock className="size-4" />} />
        <KpiCard label="Largest won deal" value={formatCurrency(r.largestDeal)} />
        <KpiCard label="Smallest won deal" value={formatCurrency(r.smallestDeal)} />
        <KpiCard label="Total lead sources" value={r.leadSources.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline funnel</CardTitle>
            <CardDescription>Open opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar data={funnelData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal type mix</CardTitle>
            <CardDescription>All opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(r.dealTypeBreakdown as Array<{ _id: string; count: number; value: number }>).map((d) => ({
                label: d._id,
                value: d.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {monthEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Win/loss monthly trend (12 months)</CardTitle>
            <CardDescription>Deal volume by outcome</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={monthEntries.map(([k, v]) => ({
                label: new Date(`${k}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
                value: v.won,
              }))}
              height={180}
            />
            <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">Won deals per month · hover bars for count</div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sales reps · 90 days</CardTitle>
            <CardDescription>Ranked by won value</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.topReps}
              getKey={(row) => String((row as { _id: unknown })._id)}
              columns={[
                { key: "name", header: "Rep", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
                { key: "wins", header: "Wins", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { wins: number }).wins}</span> },
                { key: "val", header: "Value", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { totalValue: number }).totalValue)}</span> },
              ]}
              emptyTitle="No wins yet"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top loss reasons</CardTitle>
            <CardDescription>Why we lose deals — Pareto view</CardDescription>
          </CardHeader>
          <CardContent>
            {r.lostReasons.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-4 text-center text-xs text-[var(--color-text-muted)]">
                No closed-lost deals yet.
              </div>
            ) : (
              <HorizontalBar
                data={r.lostReasons.map((l) => ({
                  label: (l._id ?? "Unspecified") as string,
                  value: l.count,
                  accent: "var(--color-danger)",
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed rep leaderboard</CardTitle>
          <CardDescription>Portfolio composition and conversion health per rep</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.repDetailedLeaderboard}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "name", header: "Sales rep", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
              { key: "total", header: "Portfolio", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { total: number }).total}</span> },
              { key: "active", header: "Active", align: "right", accessor: (x) => <span className="font-mono text-xs text-[var(--color-success)]">{(x as { active: number }).active}</span> },
              { key: "quoted", header: "Quoted", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { quoted: number }).quoted}</span> },
              { key: "qualified", header: "Qualified", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { qualified: number }).qualified}</span> },
              { key: "leads", header: "Leads", align: "right", accessor: (x) => <span className="font-mono text-xs text-[var(--color-text-muted)]">{(x as { leads: number }).leads}</span> },
              { key: "churn", header: "Churn", align: "right", accessor: (x) => <span className="font-mono text-xs text-[var(--color-danger)]">{(x as { churned: number }).churned}</span> },
              {
                key: "ratio",
                header: "Active %",
                align: "right",
                accessor: (x) => {
                  const d = x as { active: number; total: number };
                  const pct = d.total > 0 ? (d.active / d.total) * 100 : 0;
                  return <span className={`font-mono text-xs ${pct >= 40 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>{pct.toFixed(0)}%</span>;
                },
              },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead sources</CardTitle>
            <CardDescription>Channels driving customer acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(r.leadSources as Array<{ _id: string; count: number; active: number }>).map((l) => ({
                label: (l._id ?? "other").replace("_", " "),
                value: l.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent closed-won deals</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.recentWinsSample}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/sales/opportunities/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "title", header: "Deal", accessor: (x) => <span className="text-xs">{(x as { title: string }).title}</span> },
                { key: "value", header: "Value", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { value: number }).value)}</span> },
                {
                  key: "date",
                  header: "Closed",
                  accessor: (x) => {
                    const d = (x as { actualCloseDate?: Date }).actualCloseDate;
                    return d ? <span className="text-[11px]">{formatDate(d)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  },
                },
              ]}
              emptyTitle="No recent wins"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation status breakdown</CardTitle>
          <CardDescription>All quotations in the system by current status</CardDescription>
        </CardHeader>
        <CardContent>
          <HorizontalBar
            data={(r.quotationStatusBreakdown as Array<{ _id: string; count: number; totalValue: number }>).map((q) => ({
              label: q._id,
              value: q.count,
              accent:
                q._id === "accepted"
                  ? "var(--color-success)"
                  : q._id === "rejected" || q._id === "expired"
                    ? "var(--color-danger)"
                    : "var(--color-info)",
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function ServiceReport({ ctx }: { ctx: Ctx }) {
  const r = await getServiceReport(ctx);

  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowData = dowLabels.map((label, i) => ({
    label,
    value: (r.dayOfWeekDistribution as Array<{ _id: number; count: number }>).find((d) => d._id === i + 1)?.count ?? 0,
  }));

  const dailyTrendData = (r.dailyTrend as Array<{ _id: { d: number; m: number; y: number }; total: number }>)
    .slice(-14)
    .map((d) => ({
      label: `${d._id.d}/${d._id.m}`,
      value: d.total,
    }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Visits (30d)" value={r.totalVisits} icon={<Wrench className="size-4" />} />
        <KpiCard label="Completion rate" value={formatPercent(r.completionRate, 1)} accent={r.completionRate >= 85 ? "success" : "warning"} icon={<CheckCircle2 className="size-4" />} />
        <KpiCard label="Avg rating" value={r.avgRating ? `${r.avgRating.toFixed(1)}★` : "—"} hint={`${r.totalRatings} ratings`} icon={<Star className="size-4" />} accent="gold" />
        <KpiCard label="Duration variance" value={`${r.avgDurationVariance > 0 ? "+" : ""}${Math.round(r.avgDurationVariance)} min`} hint={`Actual ${Math.round(r.avgActualDuration)} vs expected ${Math.round(r.avgExpectedDuration)}`} accent={Math.abs(r.avgDurationVariance) < 10 ? "success" : "warning"} icon={<Clock className="size-4" />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active emergencies" value={r.emergencyCount} icon={<Siren className="size-4" />} accent={r.emergencyCount > 0 ? "danger" : "default"} />
        <KpiCard label="Avg emergency duration" value={`${Math.round(r.emergencyAvgDuration)} min`} hint="Target: 60 min" />
        <KpiCard label="Re-visited units (30d)" value={r.reVisitUnits} hint="Same unit, multiple visits" accent={r.reVisitUnits > 0 ? "warning" : "default"} />
        <KpiCard label="Spare parts used (30d)" value={r.sparePartsUsed.total} hint={`${r.sparePartsUsed.requests} requests`} icon={<Package className="size-4" />} />
      </div>

      {dailyTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily visit volume (last 14 days)</CardTitle>
            <CardDescription>Operational rhythm</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={dailyTrendData} height={160} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Visit type mix</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={r.visitTypes.map((v) => ({
                label: v._id.replace("_", " "),
                value: v.count,
                accent: v._id === "emergency" ? "var(--color-danger)" : v._id === "corrective" ? "var(--color-warning)" : "var(--color-brand)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rating distribution</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={[5, 4, 3, 2, 1].map((star) => ({
                label: `${star}★`,
                value: r.ratingBreakdown.find((x) => x._id === star)?.count ?? 0,
                accent: star >= 4 ? "var(--color-success)" : star === 3 ? "var(--color-warning)" : "var(--color-danger)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Day-of-week workload</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar data={dowData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top technicians · 30d</CardTitle>
            <CardDescription>Ranked by visits completed</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.topTechs}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "name", header: "Technician", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
                { key: "visits", header: "Visits", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { visits: number }).visits}</span> },
                {
                  key: "rating",
                  header: "Rating",
                  accessor: (x) => {
                    const v = (x as { avgRating: number | null }).avgRating;
                    return v ? <span className="text-[var(--color-accent-gold)]">{v.toFixed(1)}★</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  },
                },
                {
                  key: "onTime",
                  header: "On-time",
                  align: "right",
                  accessor: (x) => {
                    const v = (x as { onTimeRate: number | null }).onTimeRate;
                    return v !== null && v !== undefined ? <span className="font-mono text-xs">{v.toFixed(0)}%</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  },
                },
              ]}
              emptyTitle="No completed visits"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--color-warning)]" /> Technicians needing coaching
            </CardTitle>
            <CardDescription>Bottom 5 by rating / variance</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.bottomTechs}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "name", header: "Technician", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
                { key: "visits", header: "Visits", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { visits: number }).visits}</span> },
                {
                  key: "rating",
                  header: "Rating",
                  accessor: (x) => {
                    const v = (x as { avgRating: number | null }).avgRating;
                    return v ? <span className="text-[var(--color-warning)]">{v.toFixed(1)}★</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  },
                },
                {
                  key: "var",
                  header: "Δ min",
                  align: "right",
                  accessor: (x) => {
                    const v = (x as { avgVariance: number }).avgVariance;
                    return <span className={`font-mono text-xs ${Math.abs(v) <= 10 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{v > 0 ? "+" : ""}{v}</span>;
                  },
                },
              ]}
              emptyTitle="All techs performing well"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Priority mix · 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <HorizontalBar
            data={(r.visitsByPriority as Array<{ _id: string; count: number }>).map((p) => ({
              label: p._id,
              value: p.count,
              accent: p._id === "critical" ? "var(--color-danger)" : p._id === "high" ? "var(--color-warning)" : "var(--color-info)",
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent customer feedback (last 7 days)</CardTitle>
          <CardDescription>Live pulse — good and bad</CardDescription>
        </CardHeader>
        <CardContent>
          {r.recentFeedback.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
              No feedback received in the last week
            </div>
          ) : (
            <div className="space-y-2">
              {r.recentFeedback.map((v) => {
                const fb = v.customerFeedback as { rating: number; comment?: string; submittedAt?: Date } | null;
                const c = v.customerId as unknown as { commercialName?: string } | null;
                const t = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;
                if (!fb) return null;
                return (
                  <Link
                    key={String(v._id)}
                    href={`/service/work-orders/${String(v._id)}`}
                    className="block rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 transition-colors hover:border-[var(--color-border-default)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={fb.rating >= 4 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-warning)]"}>
                            {"★".repeat(fb.rating)}
                            <span className="text-[var(--color-text-disabled)]">{"★".repeat(5 - fb.rating)}</span>
                          </span>
                          <span className="font-medium">{c?.commercialName}</span>
                        </div>
                        {fb.comment && <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">&ldquo;{fb.comment}&rdquo;</div>}
                        <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                          By {t?.firstName} {t?.lastName} · {fb.submittedAt ? formatDate(fb.submittedAt) : ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function FinanceReport({ ctx }: { ctx: Ctx }) {
  const r = await getFinanceReport(ctx);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="YTD revenue"
          value={formatCurrency(r.ytdRevenue)}
          hint="Year-to-date collections"
          icon={<Coins className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="YoY growth"
          value={formatPercent(r.yoyGrowth, 1)}
          hint={`Last year: ${formatCurrency(r.lastYearTotal)}`}
          icon={r.yoyGrowth >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          accent={r.yoyGrowth >= 0 ? "success" : "danger"}
          delta={{ value: r.yoyGrowth }}
        />
        <KpiCard label="VAT collected YTD" value={formatCurrency(r.vatCollectedYtd)} icon={<Receipt className="size-4" />} />
        <KpiCard label="Active contracts" value={r.revenueByType.reduce((a, t) => a + t.count, 0)} hint={formatCurrency(r.revenueByType.reduce((a, t) => a + t.total, 0))} icon={<DollarSign className="size-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by month · YTD</CardTitle>
          <CardDescription>Cash collection per month</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={r.revenueByMonth.map((m) => ({
              label: new Date(new Date().getFullYear(), m._id.m - 1, 1).toLocaleDateString("en-GB", { month: "short" }),
              value: m.total / 1000,
            }))}
            height={200}
          />
          <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">Values in SAR thousands · hover for exact amount</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by contract type</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={r.revenueByType.map((t) => ({
                label: t._id.replace(/_/g, " "),
                value: t.total,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment methods</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={r.paymentMethods.map((p) => ({
                label: p._id.replace("_", " "),
                value: p.total,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top customers by revenue</CardTitle>
            <CardDescription>All-time paid invoices</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.topCustomersByRevenue}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "name", header: "Customer", accessor: (x) => <span className="text-xs">{(x as { commercialName: string }).commercialName}</span> },
                { key: "rev", header: "Revenue", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { revenue: number }).revenue)}</span> },
                { key: "inv", header: "Invoices", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { invoices: number }).invoices}</span> },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing cycle mix</CardTitle>
            <CardDescription>How contracts are billed</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={(r.contractValueByBilling as Array<{ _id: string; count: number; total: number }>).map((b) => ({
                label: b._id.replace("_", " "),
                value: b.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.invoiceStatusBreakdown}
            getKey={(row) => String((row as { _id: string })._id)}
            rowHref={(row) => `/finance/invoices?status=${(row as { _id: string })._id}`}
            columns={[
              { key: "status", header: "Status", accessor: (x) => <Badge variant="outline">{(x as { _id: string })._id}</Badge> },
              { key: "count", header: "Count", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { count: number }).count}</span> },
              { key: "total", header: "Total value", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { total: number }).total)}</span> },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avg contract value by type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.marginByType}
            getKey={(row) => String((row as { _id: string })._id)}
            columns={[
              { key: "type", header: "Type", accessor: (x) => <Badge variant="outline">{String((x as { _id: string })._id).replace(/_/g, " ")}</Badge> },
              { key: "avg", header: "Avg contract value", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { avgTotal: number }).avgTotal)}</span> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function CollectionReport({ ctx }: { ctx: Ctx }) {
  const r = await getCollectionReport(ctx);

  const buckets = ["current", "1-30", "31-60", "61-90", "90+"];
  const trendData = (r.collectionTrend as Array<{ _id: { y: number; m: number }; total: number }>).map((t) => ({
    label: new Date(t._id.y, t._id.m - 1, 1).toLocaleDateString("en-GB", { month: "short" }),
    value: t.total / 1000,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total AR" value={formatCurrency(r.totalAR)} icon={<Coins className="size-4" />} href="/finance/invoices?status=issued" />
        <KpiCard label="DSO (days)" value={Math.round(r.dso)} hint="Target: 45" accent={r.dso > 60 ? "danger" : r.dso > 45 ? "warning" : "success"} icon={<Clock className="size-4" />} />
        <KpiCard label="Collected (90d)" value={formatCurrency(r.collectionRate90d.total)} hint={`${r.collectionRate90d.count} payments`} icon={<CheckCircle2 className="size-4" />} accent="success" />
        <KpiCard label="Write-offs" value={r.writeOffs} accent={r.writeOffs > 0 ? "warning" : "default"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="PTP hit rate" value={formatPercent(r.ptpHitRate, 0)} hint={`${r.ptpKept} kept · ${r.ptpBroken} broken`} accent={r.ptpHitRate >= 70 ? "success" : "warning"} />
        <KpiCard label="Active PTPs" value={r.ptpActive} href="/finance/collection/promises-to-pay" />
        <KpiCard label="PTPs broken" value={r.ptpBroken} accent={r.ptpBroken > 0 ? "danger" : "default"} />
        <KpiCard label="Total billed" value={formatCurrency(r.totalBilled)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>AR aging donut</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <Donut
              data={buckets.map((b) => ({
                label: b === "current" ? "Current" : b === "90+" ? "90+ days" : `${b}d`,
                value: r.aging.find((a) => a._id === b)?.total ?? 0,
                color:
                  b === "current" ? "var(--color-success)" :
                  b === "1-30" ? "var(--color-info)" :
                  b === "31-60" ? "var(--color-warning)" :
                  b === "61-90" ? "#fb923c" : "var(--color-danger)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aging breakdown</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={buckets.map((b) => {
                const a = r.aging.find((x) => x._id === b);
                return {
                  label: b === "current" ? "Current" : b === "90+" ? "90+ days" : `${b}d`,
                  value: a?.total ?? 0,
                  accent:
                    b === "current" ? "var(--color-success)" :
                    b === "1-30" ? "var(--color-info)" :
                    b === "31-60" ? "var(--color-warning)" :
                    b === "61-90" ? "#fb923c" : "var(--color-danger)",
                };
              })}
            />
          </CardContent>
        </Card>
      </div>

      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection trend · last 90 days</CardTitle>
            <CardDescription>Monthly collections (SAR thousands)</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={trendData} height={180} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Collection officer performance</CardTitle>
          <CardDescription>Portfolio × collection rate</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.officerPerf}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "name", header: "Officer", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
              { key: "portfolio", header: "Portfolio", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { portfolioCount: number }).portfolioCount}</span> },
              { key: "value", header: "Total value", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { portfolioValue: number }).portfolioValue)}</span> },
              { key: "collected", header: "Collected", align: "right", accessor: (x) => <span className="font-mono text-xs text-[var(--color-success)]">{formatCurrency((x as { collectedValue: number }).collectedValue)}</span> },
              {
                key: "rate",
                header: "Rate",
                align: "right",
                accessor: (x) => {
                  const v = (x as { collectionRate: number }).collectionRate;
                  return <span className={`font-mono text-xs ${v >= 70 ? "text-[var(--color-success)]" : v >= 50 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"}`}>{v.toFixed(0)}%</span>;
                },
              },
              { key: "overdue", header: "Overdue", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { overdueCount: number }).overdueCount}</span> },
            ]}
            emptyTitle="No officers assigned"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top overdue customers</CardTitle>
          <CardDescription>Biggest outstanding balances</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.topOverdueCustomers}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "name", header: "Customer", accessor: (x) => <span className="text-xs">{(x as { commercialName: string }).commercialName}</span> },
              { key: "invoices", header: "Invoices", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { count: number }).count}</span> },
              { key: "days", header: "Max days", align: "right", accessor: (x) => <span className={`font-mono text-xs ${(x as { maxDays: number }).maxDays > 90 ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"}`}>{(x as { maxDays: number }).maxDays}d</span> },
              { key: "total", header: "Balance", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { totalOverdue: number }).totalOverdue)}</span> },
            ]}
            emptyTitle="No overdue customers"
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function CustomerReport({ ctx }: { ctx: Ctx }) {
  const r = await getCustomerHealthReport(ctx);

  const acquisitionData = (r.customerAcquisitionMonthly as Array<{ _id: { y: number; m: number }; count: number; activated: number }>).map((m) => ({
    label: new Date(m._id.y, m._id.m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    value: m.count,
  }));

  const ageBuckets = r.customerAgeBuckets as Array<{ _id: number | string; count: number }>;
  const ageBucketLabels: Record<string, string> = {
    "0": "< 3 months",
    "90": "3–6 months",
    "180": "6–12 months",
    "365": "1–2 years",
    "730": "2+ years",
    "9999": "2+ years",
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total customers" value={r.totalCustomers} icon={<Users className="size-4" />} href="/customers" />
        <KpiCard label="Active" value={r.activeCustomers} accent="success" href="/customers?status=active" />
        <KpiCard label="Churn rate" value={formatPercent(r.churnRate, 1)} hint={`${r.churnedCustomers} churned`} accent={r.churnRate > 5 ? "warning" : "success"} icon={<TrendingDown className="size-4" />} />
        <KpiCard label="Avg satisfaction" value={r.avgRating ? `${r.avgRating.toFixed(1)}★` : "—"} hint={`${r.totalRatings} ratings`} icon={<Star className="size-4" />} accent="gold" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open disputes" value={r.openDisputes} accent={r.openDisputes > 0 ? "warning" : "default"} href="/disputes?open=true" icon={<AlertTriangle className="size-4" />} />
        <KpiCard label="High-risk active" value={r.topChurnRisk.length} hint="C or D rating" icon={<Heart className="size-4" />} />
        <KpiCard label="Customer segments" value={r.typeBreakdown.length} icon={<Activity className="size-4" />} />
        <KpiCard label="Health score available" value="/customers/health" href="/customers/health" hint="Composite per customer" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar
              data={r.statusBreakdown.map((s) => ({
                label: s._id.replace("_", " "),
                value: s.count,
                accent:
                  s._id === "active" ? "var(--color-success)" :
                  s._id === "churned" ? "var(--color-danger)" :
                  s._id === "on_hold" ? "var(--color-text-muted)" : "var(--color-info)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Type breakdown</CardTitle></CardHeader>
          <CardContent>
            <HorizontalBar data={r.typeBreakdown.map((t) => ({ label: t._id, value: t.count }))} />
          </CardContent>
        </Card>
      </div>

      {acquisitionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Customer acquisition · last 90 days</CardTitle>
            <CardDescription>New customers added per month</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={acquisitionData} height={160} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk rating distribution</CardTitle>
            <CardDescription>A = low risk, D = high risk</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={["A", "B", "C", "D"].map((grade) => ({
                label: `Risk ${grade}`,
                value: r.riskBreakdown.find((x) => x._id === grade)?.count ?? 0,
                accent: grade === "A" ? "var(--color-success)" : grade === "B" ? "var(--color-info)" : grade === "C" ? "var(--color-warning)" : "var(--color-danger)",
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer age (since activation)</CardTitle>
            <CardDescription>Tenure distribution of active customers</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBar
              data={ageBuckets.map((b) => ({
                label: ageBucketLabels[String(b._id)] ?? String(b._id),
                value: b.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top customers by lifetime value</CardTitle>
          <CardDescription>Based on paid invoices</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.topCustomersByLifetime}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "name", header: "Customer", accessor: (x) => <span className="text-xs">{(x as { commercialName: string }).commercialName}</span> },
              { key: "type", header: "Type", accessor: (x) => <Badge variant="outline">{(x as { type: string }).type}</Badge> },
              { key: "invoices", header: "Invoices", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { invoices: number }).invoices}</span> },
              { key: "ltv", header: "Lifetime value", align: "right", accessor: (x) => <span className="font-mono text-xs font-semibold">{formatCurrency((x as { ltv: number }).ltv)}</span> },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Churn-risk active customers</CardTitle>
          <CardDescription>High-risk (C/D) customers currently active — save before they leave</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={r.topChurnRisk}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "name", header: "Customer", accessor: (x) => <span className="text-xs">{(x as { commercialName: string }).commercialName}</span> },
              { key: "code", header: "Code", accessor: (x) => <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{(x as { code: string }).code}</span> },
              {
                key: "risk",
                header: "Risk",
                accessor: (x) => {
                  const rk = (x as { riskRating: string }).riskRating;
                  return <Badge variant={rk === "D" ? "danger" : "warning"}>{rk}</Badge>;
                },
              },
              {
                key: "out",
                header: "Outstanding",
                align: "right",
                accessor: (x) => {
                  const o = (x as { totalOutstanding?: number }).totalOutstanding;
                  return o ? <span className="font-mono text-xs">{formatCurrency(o)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                },
              },
            ]}
            emptyTitle="No high-risk customers"
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function ExecutiveReport({ ctx }: { ctx: Ctx }) {
  const r = await getExecutiveReport(ctx);

  return (
    <div className="space-y-5">
      <Card gold>
        <CardContent className="p-6">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-accent-gold)]">Board-ready briefing</div>
          <div className="mt-2 text-lg font-semibold">MELSA Mecca · executive snapshot</div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Auto-generated from live operational data. Print or export to PDF to share.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active staff" value={r.totalUsers} accent="gold" href="/settings/users" />
        <KpiCard label="Total units" value={r.totalUnits} accent="gold" href="/units" />
        <KpiCard label="Contract portfolio" value={formatCurrency(r.totalContractValue)} accent="gold" href="/contracts?status=active" />
        <KpiCard label="Customer satisfaction" value={r.customer.avgRating ? `${r.customer.avgRating.toFixed(1)}★` : "—"} hint={`${r.customer.totalRatings} ratings`} accent="gold" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active emergencies" value={r.activeEmergencies} accent={r.activeEmergencies > 0 ? "danger" : "default"} href="/service/emergency" icon={<Siren className="size-4" />} />
        <KpiCard label="Pending approvals" value={r.pendingApprovals} accent={r.pendingApprovals > 0 ? "warning" : "default"} href="/spare-parts/requests?status=pending_manager_approval" />
        <KpiCard label="Active customers" value={r.customer.activeCustomers} accent="success" href="/customers?status=active" />
        <KpiCard label="Open disputes" value={r.customer.openDisputes} accent={r.customer.openDisputes > 0 ? "warning" : "default"} href="/disputes?open=true" />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-[var(--color-brand)]" /> Sales snapshot</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Pipeline value" value={formatCurrency(r.sales.totalPipelineValue)} />
          <Stat label="Weighted forecast" value={formatCurrency(r.sales.weightedPipeline)} />
          <Stat label="Win rate (90d)" value={formatPercent(r.sales.winRate, 1)} />
          <Stat label="Won deals lifetime" value={r.sales.totalWonDeals} />
          <Stat label="Avg deal size" value={formatCurrency(r.sales.avgDealSize)} />
          <Stat label="Avg sales cycle" value={`${Math.round(r.sales.cycleDaysAvg)} days`} />
          <Stat label="Deals lost (90d)" value={r.sales.lost} />
          <Stat label="Lead sources" value={r.sales.leadSources.length} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="size-4 text-[var(--color-brand)]" /> Service snapshot</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Visits (30d)" value={r.service.totalVisits} />
          <Stat label="Completion rate" value={formatPercent(r.service.completionRate, 1)} />
          <Stat label="Avg rating" value={r.service.avgRating ? `${r.service.avgRating.toFixed(2)}★` : "—"} />
          <Stat label="Duration variance" value={`${Math.round(r.service.avgDurationVariance)}min`} />
          <Stat label="Active emergencies" value={r.service.emergencyCount} />
          <Stat label="Re-visits (30d)" value={r.service.reVisitUnits} />
          <Stat label="Spare parts used (30d)" value={r.service.sparePartsUsed.total} />
          <Stat label="Total ratings" value={r.service.totalRatings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="size-4 text-[var(--color-brand)]" /> Finance snapshot</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="YTD revenue" value={formatCurrency(r.finance.ytdRevenue)} />
          <Stat label="YoY growth" value={formatPercent(r.finance.yoyGrowth, 1)} />
          <Stat label="VAT collected YTD" value={formatCurrency(r.finance.vatCollectedYtd)} />
          <Stat label="Total AR" value={formatCurrency(r.collection.totalAR)} />
          <Stat label="DSO" value={`${Math.round(r.collection.dso)} days`} />
          <Stat label="Collected 90d" value={formatCurrency(r.collection.collectionRate90d.total)} />
          <Stat label="PTP hit rate" value={formatPercent(r.collection.ptpHitRate, 0)} />
          <Stat label="Write-offs" value={r.collection.writeOffs} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4 text-[var(--color-brand)]" /> Customer snapshot</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Total customers" value={r.customer.totalCustomers} />
          <Stat label="Active" value={r.customer.activeCustomers} />
          <Stat label="Churn rate" value={formatPercent(r.customer.churnRate, 1)} />
          <Stat label="Churned customers" value={r.customer.churnedCustomers} />
          <Stat label="High risk (C/D)" value={r.customer.topChurnRisk.length} />
          <Stat label="Top LTV customer" value={r.customer.topCustomersByLifetime[0]?.commercialName ?? "—"} />
          <Stat label="Segments" value={r.customer.typeBreakdown.length} />
          <Stat label="Open disputes" value={r.customer.openDisputes} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top revenue customers</CardTitle>
            <CardDescription>All-time paid invoices</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.finance.topCustomersByRevenue.slice(0, 5)}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "name", header: "Customer", accessor: (x) => <span className="text-xs">{(x as { commercialName: string }).commercialName}</span> },
                { key: "rev", header: "Revenue", align: "right", accessor: (x) => <span className="font-mono text-xs">{formatCurrency((x as { revenue: number }).revenue)}</span> },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top technicians (30d)</CardTitle>
            <CardDescription>Ranked by completed visits</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={r.service.topTechs.slice(0, 5)}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
              columns={[
                { key: "name", header: "Technician", accessor: (x) => <span className="text-xs">{(x as { firstName: string; lastName: string }).firstName} {(x as { firstName: string; lastName: string }).lastName}</span> },
                { key: "visits", header: "Visits", align: "right", accessor: (x) => <span className="font-mono text-xs">{(x as { visits: number }).visits}</span> },
                {
                  key: "rating",
                  header: "★",
                  accessor: (x) => {
                    const v = (x as { avgRating: number | null }).avgRating;
                    return v ? <span className="text-[var(--color-accent-gold)]">{v.toFixed(1)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 truncate font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
