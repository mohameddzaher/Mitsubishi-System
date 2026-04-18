import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Invoice, PromiseToPay, Customer, User } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Coins, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const session = await requireSession();
  await connectDB();

  const [aging, topOverdue, ptps] = await Promise.all([
    Invoice.aggregate([
      {
        $match: scopedFilter(session, {
          status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] },
          deletedAt: null,
        }),
      },
      { $group: { _id: "$agingBucket", total: { $sum: "$balance" }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      {
        $match: scopedFilter(session, {
          status: "overdue",
          deletedAt: null,
        }),
      },
      { $sort: { balance: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ]),
    PromiseToPay.find(scopedFilter(session, { status: "active" }))
      .sort({ promisedDate: 1 })
      .limit(20)
      .populate("customerId", "commercialName")
      .populate("collectionOfficerId", "firstName lastName")
      .lean(),
  ]);

  const buckets = ["current", "1-30", "31-60", "61-90", "90+"];
  const agingMap = new Map(aging.map((a) => [a._id, a]));
  const totalAR = aging.reduce((a, b) => a + b.total, 0);
  const pastDueAR =
    (agingMap.get("1-30")?.total ?? 0) +
    (agingMap.get("31-60")?.total ?? 0) +
    (agingMap.get("61-90")?.total ?? 0) +
    (agingMap.get("90+")?.total ?? 0);
  const pastDueCount =
    (agingMap.get("1-30")?.count ?? 0) +
    (agingMap.get("31-60")?.count ?? 0) +
    (agingMap.get("61-90")?.count ?? 0) +
    (agingMap.get("90+")?.count ?? 0);
  const criticalAR = (agingMap.get("61-90")?.total ?? 0) + (agingMap.get("90+")?.total ?? 0);
  const expectedThisWeek = ptps
    .filter((p) => {
      const d = new Date(p.promisedDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return d <= weekFromNow;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collection"
        description="Accounts receivable, aging analysis, promises-to-pay"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total AR" value={formatCurrency(totalAR)} icon={<Coins className="size-4" />} accent="info" />
        <KpiCard label="Past due" value={formatCurrency(pastDueAR)} hint={`${pastDueCount} invoices`} icon={<AlertCircle className="size-4" />} accent={pastDueAR > 0 ? "warning" : "default"} />
        <KpiCard label="Critical (61+ days)" value={formatCurrency(criticalAR)} icon={<TrendingUp className="size-4" />} accent={criticalAR > 0 ? "danger" : "default"} />
        <KpiCard label="Expected this week" value={formatCurrency(expectedThisWeek)} hint="From active PTPs" icon={<Calendar className="size-4" />} accent="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AR Aging</CardTitle>
          <CardDescription>Outstanding balances grouped by days past due</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {buckets.map((b) => {
              const a = agingMap.get(b);
              const total = a?.total ?? 0;
              const count = a?.count ?? 0;
              const pct = totalAR > 0 ? (total / totalAR) * 100 : 0;
              return (
                <Link
                  key={b}
                  href={`/finance/invoices?aging=${encodeURIComponent(b)}`}
                  className="block rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 transition-colors hover:border-[var(--color-border-default)]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {b === "current" ? "Current" : b === "90+" ? "90+ days" : `${b} days`}
                      <span className="ml-2 text-[var(--color-text-muted)]">({count} invoices)</span>
                    </span>
                    <span className="font-mono font-semibold">{formatCurrency(total)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-base)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background:
                          b === "current"
                            ? "var(--color-success)"
                            : b === "1-30"
                              ? "var(--color-info)"
                              : b === "31-60"
                                ? "var(--color-warning)"
                                : b === "61-90"
                                  ? "#fb923c"
                                  : "var(--color-danger)",
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top overdue customers</CardTitle>
            <CardDescription>Biggest balances requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={topOverdue}
              getKey={(row) => String((row as { _id: unknown })._id)}
              rowHref={(row) => `/customers/${String((row as { customer: { _id: unknown } }).customer._id)}`}
              columns={[
                {
                  key: "customer",
                  header: "Customer",
                  accessor: (r) => (
                    <span className="text-xs font-medium">
                      {(r as { customer: { commercialName: string } }).customer.commercialName}
                    </span>
                  ),
                },
                {
                  key: "code",
                  header: "Invoice",
                  accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span>,
                },
                {
                  key: "aging",
                  header: "Days",
                  align: "right",
                  accessor: (r) => {
                    const d = (r as { agingDays: number }).agingDays;
                    return (
                      <span className={`font-mono text-xs ${d > 90 ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"}`}>
                        {d}d
                      </span>
                    );
                  },
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { balance: number }).balance)}</span>,
                },
              ]}
              emptyTitle="No overdue invoices"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active promises to pay</CardTitle>
            <CardDescription>Customer commitments tracked by collection officers</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={ptps}
              getKey={(row) => String((row as { _id: unknown })._id)}
              columns={[
                {
                  key: "customer",
                  header: "Customer",
                  accessor: (r) => {
                    const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                    return <span className="text-xs font-medium">{c?.commercialName ?? "—"}</span>;
                  },
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { amount: number }).amount)}</span>,
                },
                {
                  key: "promised",
                  header: "Promised",
                  accessor: (r) => {
                    const d = new Date((r as { promisedDate: Date }).promisedDate);
                    const days = Math.floor((d.getTime() - Date.now()) / 86_400_000);
                    return (
                      <span className={`text-[11px] ${days < 0 ? "text-[var(--color-danger)]" : days < 3 ? "text-[var(--color-warning)]" : "text-[var(--color-text-secondary)]"}`}>
                        {formatDate(d)} {days < 0 && <span className="font-mono">({-days}d late)</span>}
                      </span>
                    );
                  },
                },
                {
                  key: "officer",
                  header: "Officer",
                  accessor: (r) => {
                    const o = (r as { collectionOfficerId: { firstName?: string; lastName?: string } | null }).collectionOfficerId;
                    return <span className="text-xs">{o ? `${o.firstName} ${o.lastName}` : "—"}</span>;
                  },
                },
              ]}
              emptyTitle="No active promises"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
