import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSalesReport,
  getServiceReport,
  getFinanceReport,
  getCollectionReport,
  getCustomerHealthReport,
} from "@/lib/kpi/reports";
import { UserRole } from "@/config/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ template: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { template } = await params;
  const ctx = {
    userId: session.user.id,
    role: session.user.role as UserRole,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };

  let rows: Array<Record<string, unknown>> = [];
  let filename = `${template}-report`;

  try {
    switch (template) {
      case "sales": {
        const r = await getSalesReport(ctx);
        rows = [
          { metric: "Pipeline value (SAR)", value: r.totalPipelineValue },
          { metric: "Weighted forecast (SAR)", value: Math.round(r.weightedPipeline) },
          { metric: "Win rate (%)", value: r.winRate.toFixed(1) },
          { metric: "Won deals", value: r.won },
          { metric: "Lost deals", value: r.lost },
          { metric: "Avg deal size (SAR)", value: Math.round(r.avgDealSize) },
          { metric: "Avg cycle (days)", value: Math.round(r.cycleDaysAvg) },
          ...r.topReps.map((t: { firstName: string; lastName: string; wins: number; totalValue: number }) => ({
            metric: `Top rep: ${t.firstName} ${t.lastName}`,
            value: `${t.wins} wins · ${t.totalValue} SAR`,
          })),
        ];
        break;
      }
      case "service": {
        const r = await getServiceReport(ctx);
        rows = [
          { metric: "Total visits (30d)", value: r.totalVisits },
          { metric: "Completion rate (%)", value: r.completionRate.toFixed(1) },
          { metric: "Avg rating", value: r.avgRating.toFixed(2) },
          { metric: "Total ratings", value: r.totalRatings },
          { metric: "Avg actual duration (min)", value: Math.round(r.avgActualDuration) },
          { metric: "Avg expected duration (min)", value: Math.round(r.avgExpectedDuration) },
          { metric: "Emergency count", value: r.emergencyCount },
          { metric: "Re-visited units (30d)", value: r.reVisitUnits },
          ...r.topTechs.map((t: { firstName: string; lastName: string; visits: number; avgRating: number | null; onTimeRate: number }) => ({
            metric: `Top tech: ${t.firstName} ${t.lastName}`,
            value: `${t.visits} visits · ${t.avgRating ?? "—"}★ · ${t.onTimeRate?.toFixed?.(0) ?? "—"}% on-time`,
          })),
        ];
        break;
      }
      case "finance": {
        const r = await getFinanceReport(ctx);
        rows = [
          { metric: "YTD revenue (SAR)", value: Math.round(r.revenueByMonth.reduce((a: number, m: { total: number }) => a + m.total, 0)) },
          { metric: "VAT collected YTD (SAR)", value: Math.round(r.vatCollectedYtd) },
          ...r.revenueByType.map((t: { _id: string; total: number; count: number }) => ({
            metric: `Revenue — ${t._id}`,
            value: `${Math.round(t.total)} SAR · ${t.count} contracts`,
          })),
          ...r.paymentMethods.map((p: { _id: string; total: number; count: number }) => ({
            metric: `Payment method — ${p._id}`,
            value: `${Math.round(p.total)} SAR · ${p.count} payments`,
          })),
        ];
        break;
      }
      case "collection": {
        const r = await getCollectionReport(ctx);
        rows = [
          { metric: "Total AR (SAR)", value: Math.round(r.totalAR) },
          { metric: "DSO (days)", value: Math.round(r.dso) },
          { metric: "Collected 90d (SAR)", value: Math.round(r.collectionRate90d.total) },
          { metric: "Write-offs", value: r.writeOffs },
          ...r.aging.map((a: { _id: string; count: number; total: number }) => ({
            metric: `Aging — ${a._id}`,
            value: `${a.count} invoices · ${Math.round(a.total)} SAR`,
          })),
          ...r.officerPerf.map((o: { firstName: string; lastName: string; portfolioCount: number; collectedValue: number; collectionRate: number }) => ({
            metric: `Officer — ${o.firstName} ${o.lastName}`,
            value: `${o.portfolioCount} invoices · ${Math.round(o.collectedValue)} collected · ${o.collectionRate.toFixed(0)}%`,
          })),
        ];
        break;
      }
      case "customers": {
        const r = await getCustomerHealthReport(ctx);
        rows = [
          { metric: "Total customers", value: r.totalCustomers },
          { metric: "Active customers", value: r.activeCustomers },
          { metric: "Churned customers", value: r.churnedCustomers },
          { metric: "Churn rate (%)", value: r.churnRate.toFixed(2) },
          { metric: "Avg rating", value: r.avgRating.toFixed(2) },
          { metric: "Open disputes", value: r.openDisputes },
          ...r.statusBreakdown.map((s: { _id: string; count: number }) => ({
            metric: `Status — ${s._id}`,
            value: s.count,
          })),
        ];
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown report" }, { status: 404 });
    }

    filename = `melsa-mkk-${template}-report`;
    return NextResponse.json({ rows, filename });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
