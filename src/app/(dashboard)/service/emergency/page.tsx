import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder } from "@/models";
import { scopedFilter } from "@/server/filters";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Siren, Radio, Clock, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PriorityBadge, WorkOrderStatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { Priority, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function EmergencyPage() {
  const session = await requireSession();
  await connectDB();

  const [active, todayCount, thisWeekCount] = await Promise.all([
    WorkOrder.find(
      scopedFilter(session, {
        type: "emergency",
        status: { $in: ["scheduled", "assigned", "in_progress"] },
        deletedAt: null,
      }),
    )
      .populate("customerId", "commercialName")
      .populate("technicianId", "firstName lastName")
      .sort({ scheduledDate: 1 })
      .lean(),
    WorkOrder.countDocuments(
      scopedFilter(session, {
        type: "emergency",
        scheduledDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        deletedAt: null,
      }),
    ),
    WorkOrder.countDocuments(
      scopedFilter(session, {
        type: "emergency",
        scheduledDate: { $gte: new Date(Date.now() - 7 * 86_400_000) },
        deletedAt: null,
      }),
    ),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2 text-[var(--color-danger)]">
            <Siren className="size-5" /> Emergency dispatch
          </span>
        }
        description="60-minute response SLA · customer care hotline 8001282828"
        actions={
          <Button variant="danger" asChild>
            <Link href="/service/work-orders/new?type=emergency">+ New emergency</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active emergencies" value={active.length} icon={<Siren className="size-4" />} accent={active.length > 0 ? "danger" : "success"} />
        <KpiCard label="Emergencies today" value={todayCount} icon={<Clock className="size-4" />} accent="warning" />
        <KpiCard label="This week" value={thisWeekCount} icon={<Radio className="size-4" />} />
        <KpiCard label="SLA target" value="60 min" icon={<AlertTriangle className="size-4" />} />
      </div>

      <Card className={active.length > 0 ? "border-[var(--color-danger)]/40" : ""}>
        <CardHeader>
          <CardTitle>Active emergency calls</CardTitle>
          <CardDescription>Live list of in-flight incidents</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={active}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
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
              { key: "priority", header: "Priority", accessor: (r) => <PriorityBadge priority={(r as { priority: Priority }).priority} /> },
              { key: "status", header: "Status", accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} /> },
              {
                key: "tech",
                header: "Technician",
                accessor: (r) => {
                  const t = (r as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
                  return <span className="text-xs">{t ? `${t.firstName} ${t.lastName}` : "Unassigned"}</span>;
                },
              },
              { key: "scheduled", header: "Reported", accessor: (r) => <span className="text-[11px]">{formatDateTime((r as { scheduledDate: Date }).scheduledDate)}</span> },
            ]}
            emptyTitle="No active emergencies"
            emptyDescription="System is calm."
          />
        </CardContent>
      </Card>
    </div>
  );
}
