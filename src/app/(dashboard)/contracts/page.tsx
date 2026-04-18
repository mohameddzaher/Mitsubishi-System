import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Contract } from "@/models";
import { scopedFilter } from "@/server/filters";
import { FileSignature, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) filter.status = sp.status;

  const [contracts, stats] = await Promise.all([
    Contract.find(filter)
      .sort({ endDate: 1 })
      .limit(200)
      .populate("customerId", "commercialName code")
      .lean(),
    Contract.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$total" } } },
    ]),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s]));

  return (
    <div className="space-y-5">
      <PageHeader title="Contracts" description="AMC, installation and modernization contracts" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active"
          value={statMap.get("active")?.count ?? 0}
          hint={formatCurrency(statMap.get("active")?.totalValue ?? 0)}
          icon={<CheckCircle2 className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Expiring soon"
          value={statMap.get("expiring_soon")?.count ?? 0}
          icon={<Clock className="size-4" />}
          accent="warning"
        />
        <KpiCard
          label="Expired"
          value={statMap.get("expired")?.count ?? 0}
          icon={<XCircle className="size-4" />}
          accent="default"
        />
        <KpiCard
          label="Renewed"
          value={statMap.get("renewed")?.count ?? 0}
          icon={<FileSignature className="size-4" />}
          accent="info"
        />
      </div>

      <SimpleTable
        data={contracts}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/contracts/${String((row as { _id: unknown })._id)}`}
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
            key: "type",
            header: "Type",
            accessor: (r) => (
              <Badge variant="outline">{String((r as { type: string }).type).replace(/_/g, " ")}</Badge>
            ),
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => {
              const s = (r as { status: string }).status;
              return (
                <Badge variant={s === "active" ? "success" : s === "expiring_soon" ? "warning" : "outline"}>
                  {s.replace(/_/g, " ")}
                </Badge>
              );
            },
          },
          {
            key: "units",
            header: "Units",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs">{(r as { unitCount: number }).unitCount}</span>,
          },
          {
            key: "period",
            header: "Period",
            accessor: (r) => {
              const c = r as { startDate: Date; endDate: Date };
              return (
                <span className="text-[11px]">
                  {formatDate(c.startDate)} → {formatDate(c.endDate)}
                </span>
              );
            },
          },
          {
            key: "total",
            header: "Value",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span>,
          },
        ]}
      />
    </div>
  );
}
