import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit, WorkOrder, Contract } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitStatusDot, WorkOrderStatusBadge } from "@/components/status-badge";
import { SimpleTable } from "@/components/data-table/simple-table";
import { KpiCard } from "@/components/kpi-card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Building2, CalendarCheck, Wrench, QrCode } from "lucide-react";
import type { UnitStatus, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let unit;
  try {
    unit = await Unit.findById(id)
      .populate("customerId", "commercialName code contacts addresses")
      .populate("activeContractId", "code type status endDate")
      .lean();
  } catch {
    notFound();
  }
  if (!unit) notFound();

  const [workOrders, totalServiceCount] = await Promise.all([
    WorkOrder.find({ unitId: id, deletedAt: null })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .populate("technicianId", "firstName lastName")
      .lean(),
    WorkOrder.countDocuments({ unitId: id, deletedAt: null, status: "completed" }),
  ]);

  const c = unit.customerId as unknown as { _id: unknown; commercialName?: string; code?: string } | null;
  const contract = unit.activeContractId as unknown as { code?: string; type?: string; status?: string; endDate?: Date } | null;
  const daysToNextService = unit.nextServiceDue
    ? Math.floor((new Date(unit.nextServiceDue).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/units" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All units
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Building2 className="size-4 text-[var(--color-brand)]" />
            <span>{unit.model}</span>
            <span className="font-mono text-sm text-[var(--color-text-muted)]">· {unit.code}</span>
            <Badge variant="outline">{String(unit.type).replace("_", " ")}</Badge>
          </span>
        }
        description={
          <span className="flex items-center gap-2">
            <UnitStatusDot status={unit.currentStatus as UnitStatus} />
            {c && (
              <>
                <span className="text-[var(--color-text-disabled)]">·</span>
                <Link href={`/customers/${String(c._id)}`} className="hover:text-[var(--color-text-primary)]">
                  {c.commercialName}
                </Link>
              </>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/units/${id}/edit`}>Edit</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/service/work-orders/new?unitId=${id}`}>+ Schedule visit</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Completed visits" value={totalServiceCount} icon={<CalendarCheck className="size-4" />} accent="success" />
        <KpiCard
          label="Next service"
          value={unit.nextServiceDue ? formatDate(unit.nextServiceDue) : "—"}
          hint={daysToNextService !== null ? `${Math.abs(daysToNextService)}d ${daysToNextService < 0 ? "overdue" : "remaining"}` : ""}
          icon={<CalendarCheck className="size-4" />}
          accent={daysToNextService !== null && daysToNextService < 0 ? "danger" : daysToNextService !== null && daysToNextService < 7 ? "warning" : "info"}
        />
        <KpiCard
          label="Warranty"
          value={unit.warrantyEnd ? (new Date(unit.warrantyEnd) > new Date() ? "Active" : "Expired") : "—"}
          hint={unit.warrantyEnd ? formatDate(unit.warrantyEnd) : ""}
          icon={<Wrench className="size-4" />}
        />
        <KpiCard
          label="Contract"
          value={contract?.status ?? "—"}
          hint={contract?.code ?? "No active contract"}
          icon={<CalendarCheck className="size-4" />}
          accent={contract?.status === "active" ? "success" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Model">{unit.model}</Row>
            <Row label="Serial number" mono>{unit.serialNumber || "—"}</Row>
            <Row label="Type">{String(unit.type).replace("_", " ")}</Row>
            <Row label="Capacity">{unit.capacity} kg</Row>
            <Row label="Speed">{unit.speed?.toFixed(1)} m/s</Row>
            <Row label="Floors served">{unit.floorsServed}</Row>
            <Row label="Travel distance">{unit.travelDistance?.toFixed(1)} m</Row>
            <Row label="Installed at">{unit.installedAt ? formatDate(unit.installedAt) : "—"}</Row>
            <Row label="QR code" mono>
              <span className="inline-flex items-center gap-1">
                <QrCode className="size-3" /> {unit.qrCode ?? "—"}
              </span>
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Status"><UnitStatusDot status={unit.currentStatus as UnitStatus} /></Row>
            <Row label="Last service">{unit.lastServiceAt ? formatDateTime(unit.lastServiceAt) : "—"}</Row>
            <Row label="Next service due">{unit.nextServiceDue ? formatDate(unit.nextServiceDue) : "—"}</Row>
            <Row label="Warranty start">{unit.warrantyStart ? formatDate(unit.warrantyStart) : "—"}</Row>
            <Row label="Warranty end">{unit.warrantyEnd ? formatDate(unit.warrantyEnd) : "—"}</Row>
            <Row label="Total visits">{workOrders.length + " on record"}</Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Service history ({workOrders.length})</TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <SimpleTable
                data={workOrders}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
                columns={[
                  { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                  { key: "date", header: "Scheduled", accessor: (r) => <span className="text-[11px]">{formatDate((r as { scheduledDate: Date }).scheduledDate)}</span> },
                  { key: "type", header: "Type", accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge> },
                  { key: "status", header: "Status", accessor: (r) => <WorkOrderStatusBadge status={(r as { status: WorkOrderStatus }).status} /> },
                  {
                    key: "tech",
                    header: "Technician",
                    accessor: (r) => {
                      const t = (r as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
                      return <span className="text-xs">{t ? `${t.firstName} ${t.lastName}` : "—"}</span>;
                    },
                  },
                ]}
                emptyTitle="No service history yet"
              />
            </TabsContent>
            <TabsContent value="docs">
              <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                {unit.documents?.length ? `${unit.documents.length} documents attached.` : "No documents uploaded."}
              </div>
            </TabsContent>
            <TabsContent value="photos">
              <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                {unit.photos?.length ? `${unit.photos.length} photos attached.` : "No photos uploaded."}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className={mono ? "font-mono text-[11px]" : ""}>{children}</span>
    </div>
  );
}
