import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { PurchaseOrder, Vendor } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Truck, Clock, CheckCircle2, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const session = await requireSession();
  await connectDB();

  const [pos, vendors] = await Promise.all([
    PurchaseOrder.find(scopedFilter(session, { deletedAt: null }))
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("vendorId", "name code rating")
      .lean(),
    Vendor.find(scopedFilter(session, { deletedAt: null })).lean(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Procurement" description="Purchase orders and vendor management" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending approval" value={pos.filter((p) => p.status === "pending_approval").length} icon={<Clock className="size-4" />} accent="warning" />
        <KpiCard label="Approved / sent" value={pos.filter((p) => ["approved", "sent"].includes(p.status)).length} icon={<Truck className="size-4" />} accent="info" />
        <KpiCard label="Received" value={pos.filter((p) => p.status === "received").length} icon={<CheckCircle2 className="size-4" />} accent="success" />
        <KpiCard label="Active vendors" value={vendors.filter((v) => v.activeStatus).length} icon={<Package className="size-4" />} />
      </div>

      {pos.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-4" />}
          title="No purchase orders yet"
          description="Purchase orders are auto-created when a spare part request needs procurement."
        />
      ) : (
        <SimpleTable
          data={pos}
          getKey={(row) => String((row as { _id: unknown })._id)}
          rowHref={(row) => `/spare-parts/procurement/${String((row as { _id: unknown })._id)}`}
          columns={[
            { key: "code", header: "PO #", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
            {
              key: "vendor",
              header: "Vendor",
              accessor: (r) => {
                const v = (r as { vendorId: { name?: string; rating?: number } | null }).vendorId;
                return <span className="text-xs">{v?.name ?? "—"}</span>;
              },
            },
            {
              key: "items",
              header: "Items",
              align: "right",
              accessor: (r) => (
                <span className="font-mono text-xs">{(r as { items?: unknown[] }).items?.length ?? 0}</span>
              ),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span>,
            },
            {
              key: "status",
              header: "Status",
              accessor: (r) => {
                const s = (r as { status: string }).status;
                return (
                  <Badge variant={s === "received" ? "success" : s === "cancelled" ? "danger" : "info"}>
                    {s.replace(/_/g, " ")}
                  </Badge>
                );
              },
            },
            {
              key: "expected",
              header: "Expected",
              accessor: (r) => {
                const d = (r as { expectedDeliveryAt?: Date }).expectedDeliveryAt;
                return d ? <span className="text-[11px]">{formatDate(d)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              },
            },
          ]}
        />
      )}

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
        <div className="mb-3 text-sm font-semibold">Vendors</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => (
            <div
              key={String(v._id)}
              className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{v.code}</div>
                </div>
                <Badge variant={v.activeStatus ? "success" : "outline"}>{v.activeStatus ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                <span>{"★".repeat(v.rating ?? 0)}{"☆".repeat(5 - (v.rating ?? 0))}</span>
                <span>·</span>
                <span>{v.avgLeadTimeDays}d lead time</span>
                <span>·</span>
                <span>{v.paymentTerms}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
