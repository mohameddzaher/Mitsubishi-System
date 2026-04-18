import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Receipt, Coins, AlertCircle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; aging?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) filter.status = sp.status;
  if (sp.aging) filter.agingBucket = sp.aging;

  const [invoices, totals] = await Promise.all([
    Invoice.find(filter)
      .sort({ issueDate: -1 })
      .limit(300)
      .populate("customerId", "commercialName code")
      .lean(),
    Invoice.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$total" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
  ]);

  const statMap = new Map(totals.map((s) => [s._id, s]));
  const outstanding = ["issued", "sent", "viewed", "partially_paid", "overdue"].reduce(
    (acc, status) => acc + (statMap.get(status)?.balance ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="ZATCA-compliant e-invoices with 15% VAT and QR codes"
        actions={
          <Button asChild>
            <Link href="/finance/invoices/new">+ New invoice</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon={<Coins className="size-4" />}
          accent="warning"
        />
        <KpiCard
          label="Paid"
          value={statMap.get("paid")?.count ?? 0}
          hint={formatCurrency(statMap.get("paid")?.total ?? 0)}
          icon={<Receipt className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Overdue"
          value={statMap.get("overdue")?.count ?? 0}
          hint={formatCurrency(statMap.get("overdue")?.balance ?? 0)}
          icon={<AlertCircle className="size-4" />}
          accent="danger"
        />
        <KpiCard
          label="Draft / pending"
          value={(statMap.get("draft")?.count ?? 0) + (statMap.get("issued")?.count ?? 0)}
          icon={<Clock className="size-4" />}
          accent="info"
        />
      </div>

      <SimpleTable
        data={invoices}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/finance/invoices/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "customer",
            header: "Customer",
            accessor: (r) => {
              const c = (r as { customerId: { commercialName?: string } | null }).customerId;
              return <span className="text-xs font-medium">{c?.commercialName ?? "—"}</span>;
            },
          },
          {
            key: "issueDate",
            header: "Issued",
            accessor: (r) => <span className="text-[11px]">{formatDate((r as { issueDate: Date }).issueDate)}</span>,
          },
          {
            key: "dueDate",
            header: "Due",
            accessor: (r) => {
              const inv = r as { dueDate: Date; status: string };
              const overdue = new Date(inv.dueDate) < new Date() && inv.status !== "paid";
              return (
                <span className={`text-[11px] ${overdue ? "text-[var(--color-danger)]" : "text-[var(--color-text-secondary)]"}`}>
                  {formatDate(inv.dueDate)}
                </span>
              );
            },
          },
          {
            key: "total",
            header: "Total",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span>,
          },
          {
            key: "balance",
            header: "Balance",
            align: "right",
            accessor: (r) => {
              const b = (r as { balance: number }).balance;
              return (
                <span className={`font-mono text-xs ${b > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
                  {formatCurrency(b)}
                </span>
              );
            },
          },
          {
            key: "aging",
            header: "Aging",
            accessor: (r) => {
              const b = (r as { agingBucket?: string }).agingBucket;
              if (!b || b === "current") return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              return (
                <span className="font-mono text-[10px] text-[var(--color-warning)]">
                  {b}d
                </span>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => <InvoiceStatusBadge status={(r as { status: InvoiceStatus }).status} />,
          },
        ]}
      />
    </div>
  );
}
