import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { WorkOrderStatusBadge, PriorityBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder } from "@/models";
import { scopedFilter } from "@/server/filters";
import { CalendarCheck, CheckCircle2, Wrench, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Priority, WorkOrderStatus } from "@/config/constants";
import { UserRole } from "@/config/roles";

export const dynamic = "force-dynamic";

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; priority?: string; tech?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const baseFilter = scopedFilter(session, { deletedAt: null });
  if (sp.status) baseFilter.status = sp.status;
  if (sp.type) baseFilter.type = sp.type;
  if (sp.priority) baseFilter.priority = sp.priority;

  // Technicians only see their own
  const isTech = [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.INSTALLATION_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN].includes(
    session.user.role,
  );
  if (isTech) baseFilter.technicianId = session.user.id;
  else if (sp.tech) baseFilter.technicianId = sp.tech;

  const [workOrders, stats] = await Promise.all([
    WorkOrder.find(baseFilter)
      .sort({ scheduledDate: -1 })
      .limit(300)
      .populate("customerId", "commercialName code")
      .populate("unitId", "code model")
      .populate("technicianId", "firstName lastName")
      .lean(),
    WorkOrder.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s.count]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work orders"
        description="Service visits, emergencies, inspections and modernizations"
        actions={
          <Button asChild>
            <Link href="/service/work-orders/new">+ New work order</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Scheduled" value={statMap.get("scheduled") ?? 0} icon={<CalendarCheck className="size-4" />} accent="info" />
        <KpiCard label="In progress" value={statMap.get("in_progress") ?? 0} icon={<Wrench className="size-4" />} accent="warning" />
        <KpiCard label="Completed" value={statMap.get("completed") ?? 0} icon={<CheckCircle2 className="size-4" />} accent="success" />
        <KpiCard label="Cancelled" value={statMap.get("cancelled") ?? 0} icon={<AlertCircle className="size-4" />} accent="default" />
      </div>

      <SimpleTable
        data={workOrders}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "scheduled",
            header: "Scheduled",
            accessor: (r) => {
              const w = r as { scheduledDate: Date; scheduledTime: string };
              return (
                <span className="text-[11px]">
                  {formatDate(w.scheduledDate)} · <span className="text-[var(--color-text-muted)]">{w.scheduledTime}</span>
                </span>
              );
            },
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
            key: "unit",
            header: "Unit",
            accessor: (r) => {
              const u = (r as { unitId: { code?: string; model?: string } | null }).unitId;
              return (
                <div>
                  <div className="text-xs">{u?.model ?? "—"}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u?.code ?? ""}</div>
                </div>
              );
            },
          },
          {
            key: "type",
            header: "Type",
            accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge>,
          },
          {
            key: "priority",
            header: "Priority",
            accessor: (r) => <PriorityBadge priority={(r as { priority: Priority }).priority} />,
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} />,
          },
          {
            key: "tech",
            header: "Technician",
            accessor: (r) => {
              const t = (r as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
              return <span className="text-xs">{t ? `${t.firstName} ${t.lastName}` : "—"}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
