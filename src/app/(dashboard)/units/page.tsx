import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { UnitStatusDot } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Building2, CheckCircle2, Wrench, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { UnitStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) filter.currentStatus = sp.status;
  if (sp.type) filter.type = sp.type;

  const [units, stats] = await Promise.all([
    Unit.find(filter).sort({ createdAt: -1 }).limit(250).populate("customerId", "commercialName code").lean(),
    Unit.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$currentStatus", count: { $sum: 1 } } },
    ]),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s.count]));
  const total = Array.from(statMap.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Units"
        description={`${total} elevators, escalators and moving walks under management`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Operational" value={statMap.get("operational") ?? 0} icon={<CheckCircle2 className="size-4" />} accent="success" />
        <KpiCard label="Under maintenance" value={statMap.get("under_maintenance") ?? 0} icon={<Wrench className="size-4" />} accent="warning" />
        <KpiCard label="Breakdown" value={statMap.get("breakdown") ?? 0} icon={<AlertCircle className="size-4" />} accent="danger" />
        <KpiCard label="Total units" value={total} icon={<Building2 className="size-4" />} />
      </div>

      <SimpleTable
        data={units}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/units/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "model",
            header: "Model / Type",
            accessor: (r) => {
              const u = r as { model: string; type: string };
              return (
                <div>
                  <div className="text-xs font-medium">{u.model}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{u.type.replace("_", " ")}</div>
                </div>
              );
            },
          },
          {
            key: "customer",
            header: "Customer",
            accessor: (r) => {
              const c = (r as { customerId: { commercialName?: string; code?: string } | null }).customerId;
              return (
                <div>
                  <div className="text-xs">{c?.commercialName ?? "—"}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{c?.code ?? ""}</div>
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => <UnitStatusDot status={(r as { currentStatus: UnitStatus }).currentStatus} />,
          },
          {
            key: "capacity",
            header: "Capacity",
            align: "right",
            accessor: (r) => {
              const u = r as { capacity: number; speed: number };
              return (
                <span className="text-xs">
                  {u.capacity}kg · {u.speed.toFixed(1)}m/s
                </span>
              );
            },
          },
          {
            key: "nextService",
            header: "Next service",
            accessor: (r) => {
              const u = r as { nextServiceDue?: Date };
              if (!u.nextServiceDue) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              const days = Math.floor((new Date(u.nextServiceDue).getTime() - Date.now()) / 86_400_000);
              return (
                <span className="text-[11px]">
                  {formatDate(u.nextServiceDue)}
                  <span className={`ml-1 ${days < 0 ? "text-[var(--color-danger)]" : days < 7 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
                    ({days < 0 ? `${-days}d overdue` : `${days}d`})
                  </span>
                </span>
              );
            },
          },
          {
            key: "qr",
            header: "QR",
            accessor: (r) => (
              <Badge variant="outline">
                <span className="font-mono text-[9px]">{(r as { qrCode?: string }).qrCode?.slice(0, 14) ?? "—"}</span>
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
