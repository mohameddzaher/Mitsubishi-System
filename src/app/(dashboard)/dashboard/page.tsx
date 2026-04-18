import Link from "next/link";
import { requireSession } from "@/lib/session";
import {
  Users,
  Building2,
  FileSignature,
  Receipt,
  Coins,
  CalendarCheck,
  AlertTriangle,
  CheckSquare,
  Wrench,
  Target,
  PackageCheck,
  TrendingUp,
  TrendingDown,
  Star,
  Shield,
  ArrowRight,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleTable } from "@/components/data-table/simple-table";
import { WorkOrderStatusBadge, PriorityBadge } from "@/components/status-badge";
import { getDashboardKpis, getArAging, getRecentWorkOrders } from "@/lib/kpi/dashboard-kpis";
import {
  getRevenueTrend,
  getCustomerStatusBreakdown,
  getPipelineFunnel,
  getVisitTypeBreakdown,
  getTechnicianLeaderboard,
  getTopOverdueCustomers,
  getUnitAgeDistribution,
  getCollectionRate,
  getExecutiveSummary,
} from "@/lib/kpi/executive-kpis";
import { ROLE_LABELS, isExecutive, UserRole } from "@/config/roles";
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { APP } from "@/config/constants";
import { Sparkline, BarChart, HorizontalBar, Donut } from "@/components/charts/sparkline";
import type { Priority, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const ctx = {
    userId: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };

  const isBranchOrExec =
    isExecutive(session.user.role) ||
    session.user.role === UserRole.BRANCH_MANAGER ||
    session.user.role === UserRole.DEPUTY_BRANCH_MANAGER ||
    session.user.role === UserRole.REGIONAL_DIRECTOR;

  const isExec = isExecutive(session.user.role);

  const [
    kpis,
    aging,
    recentWOs,
    execSummary,
    revenueTrend,
    customerStatusBreakdown,
    pipelineFunnel,
    visitTypes,
    techLeaderboard,
    topOverdue,
    unitAges,
    collectionRate,
  ] = await Promise.all([
    getDashboardKpis(ctx),
    getArAging(ctx),
    getRecentWorkOrders(ctx, 8),
    isBranchOrExec ? getExecutiveSummary(ctx) : Promise.resolve(null),
    isBranchOrExec ? getRevenueTrend(ctx, 12) : Promise.resolve([]),
    isBranchOrExec ? getCustomerStatusBreakdown(ctx) : Promise.resolve([]),
    isBranchOrExec ? getPipelineFunnel(ctx) : Promise.resolve([]),
    isBranchOrExec ? getVisitTypeBreakdown(ctx) : Promise.resolve([]),
    isBranchOrExec ? getTechnicianLeaderboard(ctx, 5) : Promise.resolve([]),
    isBranchOrExec ? getTopOverdueCustomers(ctx, 8) : Promise.resolve([]),
    isBranchOrExec ? getUnitAgeDistribution(ctx) : Promise.resolve([]),
    isBranchOrExec ? getCollectionRate(ctx) : Promise.resolve({ issuedTotal: 0, collectedTotal: 0, rate: 0 }),
  ]);

  const agingTotal = aging.reduce((a, b) => a + b.total, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {isExec && <span className="text-[var(--color-accent-gold)]">◆</span>}
            <span>Welcome back, {session.user.firstName}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{ROLE_LABELS[session.user.role]}</span>
            <span className="text-[var(--color-text-disabled)]">·</span>
            <span>{APP.branchName} Regional Office</span>
            <span className="text-[var(--color-text-disabled)]">·</span>
            <span>{formatDate(new Date())}</span>
            <span className="flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2 py-0.5 text-[10px]">
              <span className="size-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              Live
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/reports">Reports</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/customers/new">+ New customer</Link>
            </Button>
          </div>
        }
      />

      {/* Executive hero strip */}
      {isBranchOrExec && execSummary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Revenue MTD"
            value={formatCurrency(execSummary.mtdRevenue)}
            delta={{ value: execSummary.momDelta, label: "vs prev month" }}
            icon={<Coins className="size-4" />}
            accent={isExec ? "gold" : "default"}
            large={isExec}
            href="/reports/finance"
          />
          <KpiCard
            label="Revenue YTD"
            value={formatCurrency(execSummary.ytdRevenue)}
            hint="Year-to-date collections"
            icon={<Coins className="size-4" />}
            accent={isExec ? "gold" : "default"}
            large={isExec}
            href="/reports/finance"
          />
          <KpiCard
            label="Contract value"
            value={formatCurrency(execSummary.contractValue)}
            hint={`${execSummary.activeContracts} active contracts`}
            icon={<FileSignature className="size-4" />}
            accent={isExec ? "gold" : "default"}
            large={isExec}
            href="/contracts?status=active"
          />
          <KpiCard
            label="Customer satisfaction"
            value={execSummary.feedbackAvg ? `${execSummary.feedbackAvg.toFixed(1)}★` : "—"}
            hint={`${execSummary.feedbackCount} ratings`}
            icon={<Star className="size-4" />}
            accent={isExec ? "gold" : "default"}
            large={isExec}
            href="/reports/customers"
          />
        </div>
      )}

      {/* Standard KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active customers" value={formatCompactNumber(kpis.activeCustomers)} hint={`of ${kpis.totalCustomers} total`} icon={<Users className="size-4" />} href="/customers?status=active" />
        <KpiCard label="Active contracts" value={formatCompactNumber(kpis.activeContracts)} hint={kpis.expiringContracts ? `${kpis.expiringContracts} expiring in 30d` : undefined} icon={<FileSignature className="size-4" />} href="/contracts?status=active" />
        <KpiCard label="Units under service" value={formatCompactNumber(kpis.totalUnits)} icon={<Building2 className="size-4" />} href="/units" />
        <KpiCard
          label="Active ratio"
          value={formatPercent(kpis.activeRatio, 0)}
          hint={`${kpis.activeCustomers} / ${kpis.activeCustomers + kpis.pipelineCustomers} pipeline`}
          delta={{ value: kpis.activeRatio - 40, label: "vs 40% target" }}
          icon={<Target className="size-4" />}
          accent={kpis.activeRatio < 40 ? "warning" : "success"}
          href="/sales/opportunities"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total AR" value={formatCurrency(kpis.totalAR)} hint={`${kpis.openInvoicesCount} open invoices`} icon={<Receipt className="size-4" />} accent={kpis.overdueInvoices > 0 ? "warning" : "default"} href="/finance/collection" />
        <KpiCard label="Collected MTD" value={formatCurrency(kpis.collectedMtd)} icon={<Coins className="size-4" />} accent="success" href="/finance/payments" />
        <KpiCard label="Visits today" value={`${kpis.visitsCompletedToday} / ${kpis.visitsToday}`} hint="Completed / scheduled" icon={<CalendarCheck className="size-4" />} accent="info" href="/service/work-orders" />
        <KpiCard label="Pending approvals" value={kpis.pendingApprovals} hint="Spare part requests" icon={<PackageCheck className="size-4" />} accent={kpis.pendingApprovals > 0 ? "warning" : "default"} href="/spare-parts/requests?status=pending_manager_approval" />
      </div>

      {/* Revenue trend chart */}
      {isBranchOrExec && revenueTrend.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[var(--color-brand)]" /> Revenue trend · last 12 months
              </CardTitle>
              <CardDescription>Monthly collected revenue</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/reports/finance">Open finance report →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <BarChart data={revenueTrend.map((r) => ({ label: r.label, value: r.value / 1000 }))} height={180} />
            <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">Values in SAR thousands · hover bars for exact amount</div>
          </CardContent>
        </Card>
      )}

      {/* AR aging + alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[var(--color-brand)]" /> AR Aging
              </CardTitle>
              <CardDescription>Outstanding balances grouped by days past due</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/finance/collection">Collection dashboard →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Donut
                  data={aging.map((b) => ({
                    label: b.bucket === "current" ? "Current" : b.bucket === "90+" ? "90+ days" : `${b.bucket}d`,
                    value: b.total,
                    color:
                      b.bucket === "current"
                        ? "var(--color-success)"
                        : b.bucket === "1-30"
                          ? "var(--color-info)"
                          : b.bucket === "31-60"
                            ? "var(--color-warning)"
                            : b.bucket === "61-90"
                              ? "#fb923c"
                              : "var(--color-danger)",
                  }))}
                />
              </div>
              <div className="space-y-2">
                {aging.map((b) => {
                  return (
                    <Link key={b.bucket} href={`/finance/invoices?aging=${encodeURIComponent(b.bucket)}`} className="block">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block size-2 rounded-sm"
                            style={{
                              background:
                                b.bucket === "current"
                                  ? "var(--color-success)"
                                  : b.bucket === "1-30"
                                    ? "var(--color-info)"
                                    : b.bucket === "31-60"
                                      ? "var(--color-warning)"
                                      : b.bucket === "61-90"
                                        ? "#fb923c"
                                        : "var(--color-danger)",
                            }}
                          />
                          {b.bucket === "current" ? "Current" : b.bucket === "90+" ? "90+ days" : `${b.bucket}d`}
                          <span className="text-[var(--color-text-muted)]">({b.count})</span>
                        </span>
                        <span className="font-mono">{formatCurrency(b.total)}</span>
                      </div>
                    </Link>
                  );
                })}
                {isBranchOrExec && collectionRate.rate > 0 && (
                  <div className="mt-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)]">Collection rate (30d)</span>
                      <span className="font-mono font-semibold">{collectionRate.rate.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--color-warning)]" /> Alerts
            </CardTitle>
            <CardDescription>Signals worth your attention today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {execSummary && execSummary.expiring30 > 0 && <AlertRow href="/contracts?status=expiring_soon" variant="warning" text={`${execSummary.expiring30} contracts expiring in 30 days`} />}
            {execSummary && execSummary.expiring60 > execSummary.expiring30 && <AlertRow href="/contracts?status=expiring_soon" variant="info" text={`${execSummary.expiring60} expiring in 60 days`} />}
            {kpis.overdueInvoices > 0 && <AlertRow href="/finance/invoices?status=overdue" variant="danger" text={`${kpis.overdueInvoices} invoices overdue`} />}
            {kpis.pendingApprovals > 0 && <AlertRow href="/spare-parts/requests?status=pending_manager_approval" variant="info" text={`${kpis.pendingApprovals} spare part requests awaiting approval`} />}
            {execSummary && execSummary.criticalDisputes > 0 && <AlertRow href="/disputes?severity=critical" variant="danger" text={`${execSummary.criticalDisputes} critical disputes open`} />}
            {execSummary && execSummary.lowStockCount > 0 && <AlertRow href="/spare-parts/inventory" variant="warning" text={`${execSummary.lowStockCount} parts below reorder level`} />}
            {kpis.openTasks > 0 && <AlertRow href="/tasks" variant="info" text={`${kpis.openTasks} tasks in flight`} />}
            {kpis.activeRatio < 40 && <AlertRow href="/sales/opportunities" variant="warning" text={`Active ratio at ${formatPercent(kpis.activeRatio, 0)}, below 40% target`} />}
          </CardContent>
        </Card>
      </div>

      {/* Executive intel panel */}
      {isBranchOrExec && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="size-4 text-[var(--color-brand)]" /> Customer intelligence</CardTitle>
                <CardDescription>Status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  data={customerStatusBreakdown.map((c) => ({
                    label: c.status.replace("_", " "),
                    value: c.count,
                    accent:
                      c.status === "active"
                        ? "var(--color-success)"
                        : c.status === "churned"
                          ? "var(--color-danger)"
                          : c.status === "on_hold"
                            ? "var(--color-text-muted)"
                            : "var(--color-info)",
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="size-4 text-[var(--color-brand)]" /> Sales pipeline</CardTitle>
                <CardDescription>Deal count × stage</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  data={pipelineFunnel
                    .filter((p) => !["won", "lost", "on_hold"].includes(p.stage))
                    .map((p) => ({ label: p.stage.replace("_", " "), value: p.count }))}
                />
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-2 text-[11px]">
                  <span className="text-[var(--color-text-muted)]">Total pipeline value</span>
                  <span className="font-mono font-semibold">{formatCurrency(pipelineFunnel.reduce((a, p) => a + (p.value ?? 0), 0))}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="size-4 text-[var(--color-brand)]" /> Field operations</CardTitle>
                <CardDescription>Visits by type (30d)</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  data={visitTypes.map((v) => ({
                    label: v.type.replace("_", " "),
                    value: v.count,
                    accent: v.type === "emergency" ? "var(--color-danger)" : v.type === "corrective" ? "var(--color-warning)" : "var(--color-brand)",
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Technician leaderboard</CardTitle>
                  <CardDescription>Top performers · last 30 days</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild><Link href="/service/dispatch">Dispatch →</Link></Button>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleTable
                  data={techLeaderboard}
                  getKey={(r) => String((r as { _id: unknown })._id)}
                  rowHref={(r) => `/team/${String((r as { _id: unknown })._id)}`}
                  columns={[
                    {
                      key: "name",
                      header: "Technician",
                      accessor: (r) => {
                        const t = r as { firstName: string; lastName: string; employeeId?: string };
                        return (
                          <div>
                            <div className="text-xs font-medium">{t.firstName} {t.lastName}</div>
                            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{t.employeeId}</div>
                          </div>
                        );
                      },
                    },
                    { key: "visits", header: "Visits", align: "right", accessor: (r) => <span className="font-mono text-xs">{(r as { visitsCompleted: number }).visitsCompleted}</span> },
                    {
                      key: "rating",
                      header: "Rating",
                      accessor: (r) => {
                        const v = (r as { avgRating: number | null }).avgRating;
                        return v ? <span className="text-[var(--color-accent-gold)]">{v.toFixed(1)}★</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                      },
                    },
                    {
                      key: "var",
                      header: "Duration Δ",
                      align: "right",
                      accessor: (r) => {
                        const v = (r as { avgDurationVariance: number | null }).avgDurationVariance;
                        if (v === null || v === undefined) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                        return (
                          <span className={`font-mono text-[11px] ${Math.abs(v) < 10 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                            {v > 0 ? "+" : ""}{v}min
                          </span>
                        );
                      },
                    },
                  ]}
                  emptyTitle="No completed visits yet"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Top overdue customers</CardTitle>
                  <CardDescription>Biggest balances needing attention</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild><Link href="/finance/collection">Collection →</Link></Button>
              </CardHeader>
              <CardContent className="p-0">
                <SimpleTable
                  data={topOverdue}
                  getKey={(r) => String((r as { _id: unknown })._id)}
                  rowHref={(r) => `/customers/${String((r as { _id: unknown })._id)}`}
                  columns={[
                    { key: "name", header: "Customer", accessor: (r) => <span className="text-xs font-medium">{(r as { commercialName: string }).commercialName}</span> },
                    { key: "invoices", header: "Invoices", align: "right", accessor: (r) => <span className="font-mono text-xs">{(r as { invoiceCount: number }).invoiceCount}</span> },
                    { key: "days", header: "Max days", align: "right", accessor: (r) => <span className={`font-mono text-xs ${(r as { maxDays: number }).maxDays > 90 ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"}`}>{(r as { maxDays: number }).maxDays}d</span> },
                    { key: "total", header: "Balance", align: "right", accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { totalOverdue: number }).totalOverdue)}</span> },
                  ]}
                  emptyTitle="No overdue customers"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> Asset age distribution</CardTitle>
                <CardDescription>Units by installation age</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBar
                  data={unitAges.map((u) => ({
                    label: u.label,
                    value: u.count,
                    accent: u.label === "15y+" ? "var(--color-warning)" : u.label === "10–15y" ? "#fb923c" : "var(--color-info)",
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="size-4" /> Risk & compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Row label="Critical disputes open" value={execSummary?.criticalDisputes ?? 0} danger={(execSummary?.criticalDisputes ?? 0) > 0} />
                <Row label="All open disputes" value={execSummary?.openDisputes ?? 0} />
                <Row label="Contracts expiring 30d" value={execSummary?.expiring30 ?? 0} danger={(execSummary?.expiring30 ?? 0) > 3} />
                <Row label="Low-stock SKUs" value={execSummary?.lowStockCount ?? 0} />
                <Row label="Safety incidents YTD" value={0} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="size-4" /> People</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <Row label="Technicians active" value={execSummary?.technicianCount ?? 0} />
                <Row label="Sales team size" value={execSummary?.salesTeamCount ?? 0} />
                <Row label="Avg customer rating" value={execSummary?.feedbackAvg ? `${execSummary.feedbackAvg.toFixed(1)}★` : "—"} />
                <Row label="CSAT responses" value={execSummary?.feedbackCount ?? 0} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Recent work orders */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Wrench className="size-4 text-[var(--color-brand)]" /> Recent work orders</CardTitle>
            <CardDescription>Live feed of the 8 most recent visits</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild><Link href="/service/work-orders">View all →</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={recentWOs}
            rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
            getKey={(row) => String((row as { _id: unknown })._id)}
            columns={[
              { key: "code", header: "Code", accessor: (row) => <span className="font-mono text-xs text-[var(--color-text-secondary)]">{(row as { code: string }).code}</span> },
              {
                key: "customer",
                header: "Customer",
                accessor: (row) => {
                  const c = (row as { customerId: { commercialName?: string; code?: string } | null }).customerId;
                  return (
                    <div>
                      <div className="text-xs font-medium">{c?.commercialName ?? "—"}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{c?.code ?? ""}</div>
                    </div>
                  );
                },
              },
              {
                key: "unit",
                header: "Unit",
                accessor: (row) => {
                  const u = (row as { unitId: { code?: string; model?: string } | null }).unitId;
                  return (
                    <div>
                      <div className="text-xs">{u?.model ?? "—"}</div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u?.code ?? ""}</div>
                    </div>
                  );
                },
              },
              { key: "type", header: "Type", accessor: (row) => <Badge variant="outline">{String((row as { type: string }).type).replace("_", " ")}</Badge> },
              { key: "priority", header: "Priority", accessor: (row) => <PriorityBadge priority={(row as { priority: Priority }).priority} /> },
              { key: "status", header: "Status", accessor: (row) => <WorkOrderStatusBadge status={(row as { status: WorkOrderStatus }).status} /> },
              {
                key: "tech",
                header: "Technician",
                accessor: (row) => {
                  const t = (row as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
                  return <span className="text-xs">{t ? `${t.firstName ?? ""} ${t.lastName ?? ""}` : "—"}</span>;
                },
              },
              { key: "scheduledDate", header: "Scheduled", accessor: (row) => <span className="text-xs text-[var(--color-text-secondary)]">{formatDate((row as { scheduledDate: Date }).scheduledDate)}</span> },
            ]}
            emptyTitle="No work orders yet"
          />
        </CardContent>
      </Card>

      {/* Strategic recommendations */}
      {isBranchOrExec && execSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="size-4" /> Strategic recommendations</CardTitle>
            <CardDescription>Actions surfaced by the system</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs">
              {kpis.activeRatio < 40 && <Recommendation href="/sales/opportunities" text={`Active ratio at ${formatPercent(kpis.activeRatio, 0)} — below 40% target. Drive pipeline conversion.`} cta="Open pipeline" />}
              {execSummary.expiring30 > 0 && <Recommendation href="/contracts?status=expiring_soon" text={`${execSummary.expiring30} contracts expire in the next 30 days. Trigger renewal conversations.`} cta="View contracts" />}
              {kpis.overdueInvoices > 0 && <Recommendation href="/finance/collection" text={`${kpis.overdueInvoices} invoices are overdue. Focus collection calls today.`} cta="Collection" />}
              {execSummary.lowStockCount > 0 && <Recommendation href="/spare-parts/inventory" text={`${execSummary.lowStockCount} SKUs below reorder level. Issue POs to avoid stockouts.`} cta="Inventory" />}
              {execSummary.criticalDisputes > 0 && <Recommendation href="/disputes?severity=critical" text={`${execSummary.criticalDisputes} critical disputes need executive attention.`} cta="Review disputes" />}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertRow({ href, variant, text }: { href: string; variant: "info" | "warning" | "danger"; text: string }) {
  return (
    <Link href={href} className="flex items-start gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2.5 text-xs transition-colors hover:border-[var(--color-border-default)]">
      <span className={`mt-1 size-1.5 shrink-0 rounded-full ${variant === "danger" ? "bg-[var(--color-danger)]" : variant === "warning" ? "bg-[var(--color-warning)]" : "bg-[var(--color-info)]"}`} />
      <span className="text-[var(--color-text-secondary)]">{text}</span>
    </Link>
  );
}

function Row({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className={`font-mono font-semibold ${danger ? "text-[var(--color-danger)]" : ""}`}>{value}</span>
    </div>
  );
}

function Recommendation({ href, text, cta }: { href: string; text: string; cta: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <span className="flex-1">{text}</span>
      <Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-overlay)] px-2.5 py-1 text-[11px] hover:border-[var(--color-brand)]">
        {cta} <ArrowRight className="size-3" />
      </Link>
    </li>
  );
}
