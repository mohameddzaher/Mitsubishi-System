import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Wallet, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await requireSession();
  await connectDB();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [payments, mtdAgg, allAgg] = await Promise.all([
    Payment.find(scopedFilter(session, { deletedAt: null }))
      .sort({ receivedAt: -1 })
      .limit(200)
      .populate("customerId", "commercialName code")
      .populate("receivedById", "firstName lastName")
      .lean(),
    Payment.aggregate([
      {
        $match: scopedFilter(session, {
          receivedAt: { $gte: monthStart },
          deletedAt: null,
        }),
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$method", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
  ]);

  const mtd = mtdAgg[0] ?? { total: 0, count: 0 };

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Incoming payments from customers" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Collected MTD" value={formatCurrency(mtd.total)} hint={`${mtd.count} payments`} icon={<Wallet className="size-4" />} accent="success" />
        <KpiCard label="Today" value="—" icon={<Calendar className="size-4" />} />
        <KpiCard label="Bank transfer" value={allAgg.find((a) => a._id === "bank_transfer")?.count ?? 0} />
        <KpiCard label="Cash" value={allAgg.find((a) => a._id === "cash")?.count ?? 0} />
      </div>

      <SimpleTable
        data={payments}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/finance/payments/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "customer",
            header: "Customer",
            accessor: (r) => {
              const c = (r as { customerId: { commercialName?: string } | null }).customerId;
              return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
            },
          },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs font-semibold text-[var(--color-success)]">{formatCurrency((r as { amount: number }).amount)}</span>,
          },
          {
            key: "method",
            header: "Method",
            accessor: (r) => <Badge variant="outline">{String((r as { method: string }).method).replace("_", " ")}</Badge>,
          },
          {
            key: "reference",
            header: "Reference",
            accessor: (r) => (
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                {(r as { reference?: string }).reference ?? "—"}
              </span>
            ),
          },
          {
            key: "received",
            header: "Received",
            accessor: (r) => <span className="text-[11px]">{formatDate((r as { receivedAt: Date }).receivedAt)}</span>,
          },
          {
            key: "by",
            header: "By",
            accessor: (r) => {
              const u = (r as { receivedById: { firstName?: string; lastName?: string } | null }).receivedById;
              return <span className="text-xs">{u ? `${u.firstName} ${u.lastName}` : "—"}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
