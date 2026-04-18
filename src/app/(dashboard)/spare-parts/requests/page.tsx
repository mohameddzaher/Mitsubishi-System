import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { SparePartRequest } from "@/models";
import { scopedFilter } from "@/server/filters";
import { PackageSearch, CheckCircle2, Truck, Package } from "lucide-react";
import { formatDate, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SparePartRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) filter.status = sp.status;

  const [requests, stats] = await Promise.all([
    SparePartRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("technicianId", "firstName lastName")
      .populate("customerId", "commercialName")
      .populate("partId", "partNumber name category")
      .populate("workOrderId", "code")
      .lean(),
    SparePartRequest.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s.count]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Spare part requests"
        description="Technician → Manager → Warehouse → Procurement flow"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pending approval"
          value={statMap.get("pending_manager_approval") ?? 0}
          icon={<PackageSearch className="size-4" />}
          accent="warning"
        />
        <KpiCard
          label="Approved / in warehouse"
          value={(statMap.get("approved") ?? 0) + (statMap.get("routed_to_warehouse") ?? 0) + (statMap.get("ready_for_pickup") ?? 0)}
          icon={<Package className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="On PO / ordered"
          value={(statMap.get("po_created") ?? 0) + (statMap.get("ordered") ?? 0)}
          icon={<Truck className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="Installed"
          value={statMap.get("installed") ?? 0}
          icon={<CheckCircle2 className="size-4" />}
          accent="success"
        />
      </div>

      <SimpleTable
        data={requests}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/spare-parts/requests/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "part",
            header: "Part",
            accessor: (r) => {
              const p = (r as { partId: { name?: string; partNumber?: string; category?: string } | null }).partId;
              return (
                <div>
                  <div className="text-xs font-medium">{p?.name ?? "—"}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{p?.partNumber ?? ""}</div>
                </div>
              );
            },
          },
          {
            key: "qty",
            header: "Qty",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs">{(r as { qty: number }).qty}</span>,
          },
          {
            key: "customer",
            header: "Customer",
            accessor: (r) => {
              const c = (r as { customerId: { commercialName?: string } | null }).customerId;
              return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
            },
          },
          {
            key: "priority",
            header: "Priority",
            accessor: (r) => {
              const p = (r as { priority: string }).priority;
              return (
                <Badge variant={p === "urgent" ? "danger" : p === "scheduled" ? "outline" : "info"}>{p}</Badge>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => {
              const s = (r as { status: string }).status;
              const color =
                s === "installed" || s === "delivered"
                  ? "success"
                  : s === "pending_manager_approval"
                    ? "warning"
                    : s === "rejected"
                      ? "danger"
                      : "info";
              return <Badge variant={color}>{s.replace(/_/g, " ")}</Badge>;
            },
          },
          {
            key: "technician",
            header: "Technician",
            accessor: (r) => {
              const t = (r as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
              return <span className="text-xs">{t ? `${t.firstName} ${t.lastName}` : "—"}</span>;
            },
          },
          {
            key: "requested",
            header: "Requested",
            accessor: (r) => (
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                {relativeTime((r as { createdAt: Date }).createdAt)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
