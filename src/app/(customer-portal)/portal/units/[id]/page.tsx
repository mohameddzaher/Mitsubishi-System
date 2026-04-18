import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit, WorkOrder, Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnitStatusDot, WorkOrderStatusBadge } from "@/components/status-badge";
import { SimpleTable } from "@/components/data-table/simple-table";
import { formatDate } from "@/lib/utils";
import { Building2 } from "lucide-react";
import type { UnitStatus, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function PortalUnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let unit;
  try {
    unit = await Unit.findById(id).lean();
  } catch {
    notFound();
  }
  if (!unit || String(unit.customerId) !== String(customer._id)) notFound();

  const visits = await WorkOrder.find({ unitId: id, deletedAt: null })
    .sort({ scheduledDate: -1 })
    .limit(10)
    .lean();

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/units" className="text-[var(--color-text-muted)]">← My units</Link></div>
      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-semibold"><Building2 className="size-4 text-[var(--color-brand)]" /> {unit.model}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{unit.code}</span>
          <UnitStatusDot status={unit.currentStatus as UnitStatus} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Type</div><div>{unit.type.replace("_", " ")}</div></div>
              <div><div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Capacity</div><div>{unit.capacity} kg</div></div>
              <div><div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Speed</div><div>{unit.speed?.toFixed(1)} m/s</div></div>
              <div><div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Floors</div><div>{unit.floorsServed}</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Service</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>Last service: {unit.lastServiceAt ? formatDate(unit.lastServiceAt) : "—"}</div>
            <div>Next service due: {unit.nextServiceDue ? formatDate(unit.nextServiceDue) : "—"}</div>
            <div>Warranty: {unit.warrantyEnd && new Date(unit.warrantyEnd) > new Date() ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Expired</Badge>}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Visit history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={visits}
            getKey={(row) => String((row as { _id: unknown })._id)}
            rowHref={(row) => `/portal/visits/${String((row as { _id: unknown })._id)}`}
            columns={[
              { key: "date", header: "Date", accessor: (r) => <span className="text-[11px]">{formatDate((r as { scheduledDate: Date }).scheduledDate)}</span> },
              { key: "type", header: "Type", accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge> },
              { key: "status", header: "Status", accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} /> },
              {
                key: "rating",
                header: "Rating",
                accessor: (r) => {
                  const fb = (r as { customerFeedback?: { rating?: number } | null }).customerFeedback;
                  return fb?.rating ? <span className="text-[var(--color-accent-gold)]">{"★".repeat(fb.rating)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
                },
              },
            ]}
            emptyTitle="No visits yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
