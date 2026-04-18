import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder, SparePartRequest, SparePart } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge, WorkOrderStatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisitActions } from "./visit-actions";
import { ChecklistPanel } from "./checklist-panel";
import { PhotoInputs } from "./photo-inputs";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Phone, MapPin, User as UserIcon, Wrench, Clock, Building2, ExternalLink } from "lucide-react";
import type { Priority, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  let wo;
  try {
    wo = await WorkOrder.findById(id)
      .populate("customerId", "commercialName code contacts addresses")
      .populate("unitId", "code model type capacity speed floorsServed location")
      .populate("contractId", "code type coverage")
      .populate("technicianId", "firstName lastName phone")
      .populate("supervisorId", "firstName lastName phone")
      .lean();
  } catch {
    notFound();
  }
  if (!wo) notFound();

  const sparePartRequests = await SparePartRequest.find({ workOrderId: id }).populate("partId", "partNumber name").lean();

  const spareCatalogue = await SparePart.find({
    branchId: wo.branchId,
    deletedAt: null,
  })
    .select("partNumber name category stockLevel")
    .sort({ name: 1 })
    .limit(500)
    .lean();
  const spareOptions = spareCatalogue.map((p) => ({
    id: String(p._id),
    partNumber: p.partNumber,
    name: p.name,
    category: p.category,
    stockLevel: p.stockLevel ?? 0,
  }));

  const isAssignedTech = String(wo.technicianId?._id ?? wo.technicianId) === session.user.id;
  const canOverride = [
    "super_admin",
    "chairman",
    "ceo",
    "branch_manager",
    "deputy_branch_manager",
    "head_of_service",
    "service_manager",
    "service_supervisor",
    "dispatch_manager",
  ].includes(session.user.role);
  const isTech = isAssignedTech || canOverride;
  const c = wo.customerId as unknown as {
    _id: unknown;
    commercialName?: string;
    code?: string;
    contacts?: Array<{ name?: string; phone?: string; role?: string; isPrimary?: boolean }>;
    addresses?: Array<{ street?: string; district?: string; city?: string; latitude?: number; longitude?: number }>;
  } | null;
  const u = wo.unitId as unknown as {
    _id: unknown;
    code?: string;
    model?: string;
    type?: string;
    capacity?: number;
    speed?: number;
    floorsServed?: number;
    location?: { building?: string; floor?: string };
  } | null;
  const tech = wo.technicianId as unknown as { firstName?: string; lastName?: string; phone?: string } | null;
  const supervisor = wo.supervisorId as unknown as { firstName?: string; lastName?: string; phone?: string } | null;
  const primaryContact = c?.contacts?.find((ct) => ct.isPrimary) ?? c?.contacts?.[0];
  const addr = c?.addresses?.[0];
  const mapHref =
    addr?.latitude && addr?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`
      : null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/service/work-orders" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All work orders
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[17px]">{wo.code}</span>
            <Badge variant="outline">{String(wo.type).replace("_", " ")}</Badge>
            <PriorityBadge priority={wo.priority as Priority} />
            <WorkOrderStatusBadge status={wo.status as WorkOrderStatus} />
          </span>
        }
        description={
          <span>
            Scheduled for{" "}
            <span className="font-medium text-[var(--color-text-secondary)]">
              {formatDate(wo.scheduledDate)} at {wo.scheduledTime}
            </span>{" "}
            · Expected {wo.expectedDurationMinutes} min
          </span>
        }
        actions={isTech ? <VisitActions workOrderId={id} status={wo.status as WorkOrderStatus} spareParts={spareOptions} /> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="font-medium text-[13px]">{c?.commercialName ?? "—"}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{c?.code ?? ""}</div>
            </div>
            {primaryContact && (
              <div className="space-y-1 border-t border-[var(--color-border-subtle)] pt-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-3 text-[var(--color-text-muted)]" />
                  <span>{primaryContact.name}</span>
                  {primaryContact.role && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">({primaryContact.role})</span>
                  )}
                </div>
                {primaryContact.phone && (
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Phone className="size-3" /> {primaryContact.phone}
                  </a>
                )}
              </div>
            )}
            {addr && (
              <div className="space-y-1 border-t border-[var(--color-border-subtle)] pt-2">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3 shrink-0 text-[var(--color-text-muted)]" />
                  <div>
                    <div>{addr.street}</div>
                    <div className="text-[var(--color-text-muted)]">{addr.district}, {addr.city}</div>
                  </div>
                </div>
                {mapHref && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] hover:bg-[var(--color-bg-overlay)]"
                  >
                    <ExternalLink className="size-3" /> Google Maps directions
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4" /> Unit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <div className="font-medium">{u?.model ?? "—"}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u?.code ?? ""}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-2 text-[11px] text-[var(--color-text-secondary)]">
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-muted)]">Type</div>
                <div>{u?.type?.replace("_", " ") ?? "—"}</div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-muted)]">Capacity</div>
                <div>{u?.capacity} kg</div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-muted)]">Speed</div>
                <div>{u?.speed?.toFixed(1)} m/s</div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-muted)]">Floors</div>
                <div>{u?.floorsServed}</div>
              </div>
            </div>
            {u?.location?.building && (
              <div className="border-t border-[var(--color-border-subtle)] pt-2 text-[11px] text-[var(--color-text-muted)]">
                {u.location.building} · Floor {u.location.floor ?? "—"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" /> Timing & team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Technician">
              {tech ? `${tech.firstName} ${tech.lastName}` : "—"}
              {tech?.phone && (
                <a href={`tel:${tech.phone}`} className="ml-2 text-[var(--color-brand)] hover:underline">
                  call
                </a>
              )}
            </Row>
            <Row label="Supervisor">
              {supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : "—"}
              {supervisor?.phone && (
                <a href={`tel:${supervisor.phone}`} className="ml-2 text-[var(--color-brand)] hover:underline">
                  call
                </a>
              )}
            </Row>
            <Row label="Scheduled">
              {formatDate(wo.scheduledDate)} · {wo.scheduledTime}
            </Row>
            <Row label="Expected duration">{wo.expectedDurationMinutes} min</Row>
            {wo.actualStartAt && <Row label="Started">{formatDateTime(wo.actualStartAt)}</Row>}
            {wo.actualEndAt && <Row label="Ended">{formatDateTime(wo.actualEndAt)}</Row>}
            {wo.actualDurationMinutes != null && (
              <Row label="Actual duration">
                {wo.actualDurationMinutes} min
                {wo.durationVarianceMinutes != null && (
                  <Badge
                    variant={Math.abs(wo.durationVarianceMinutes) < 10 ? "success" : Math.abs(wo.durationVarianceMinutes) < 30 ? "warning" : "danger"}
                    className="ml-2"
                  >
                    {wo.durationVarianceMinutes > 0 ? "+" : ""}{wo.durationVarianceMinutes}min
                  </Badge>
                )}
              </Row>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="checklist">
            <TabsList>
              <TabsTrigger value="checklist">Checklist ({wo.checklist?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="parts">Parts ({sparePartRequests.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="rating">Rating</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist">
              <ChecklistPanel
                workOrderId={id}
                checklist={wo.checklist?.map((item) => ({
                  itemId: item.itemId,
                  label: item.label,
                  category: item.category,
                  required: item.required,
                  completed: item.completed,
                  issue: item.issue,
                  notes: item.notes,
                })) ?? []}
                editable={isTech && wo.status === "in_progress"}
              />
            </TabsContent>

            <TabsContent value="photos">
              <PhotoInputs
                workOrderId={id}
                beforePhotos={(wo.beforePhotos ?? []).map((p) => ({ url: p.url, caption: p.caption ?? "" }))}
                afterPhotos={(wo.afterPhotos ?? []).map((p) => ({ url: p.url, caption: p.caption ?? "" }))}
                editable={isTech && (wo.status === "in_progress" || wo.status === "scheduled" || wo.status === "assigned")}
              />
            </TabsContent>

            <TabsContent value="parts">
              {sparePartRequests.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                  No spare parts requested for this visit.
                </div>
              ) : (
                <div className="space-y-2">
                  {sparePartRequests.map((req) => (
                    <div
                      key={String(req._id)}
                      className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-medium">
                            {(req.partId as unknown as { name?: string })?.name ?? "—"}
                          </div>
                          <div className="font-mono text-[10px] text-[var(--color-text-muted)]">
                            {(req.partId as unknown as { partNumber?: string })?.partNumber ?? ""} · Qty {req.qty}
                          </div>
                        </div>
                        <Badge
                          variant={
                            req.status === "installed" || req.status === "delivered"
                              ? "success"
                              : req.status === "rejected"
                                ? "danger"
                                : req.status === "pending_manager_approval"
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {String(req.status).replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-3">
                {wo.technicianNotes && (
                  <NoteBlock label="Technician notes" body={wo.technicianNotes} />
                )}
                {wo.supervisorNotes && (
                  <NoteBlock label="Supervisor notes" body={wo.supervisorNotes} />
                )}
                {!wo.technicianNotes && !wo.supervisorNotes && (
                  <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                    No notes yet.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rating">
              {wo.customerFeedback?.rating ? (
                <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] text-[var(--color-accent-gold)]">
                      {"★".repeat(wo.customerFeedback.rating)}
                      <span className="text-[var(--color-text-disabled)]">
                        {"★".repeat(5 - wo.customerFeedback.rating)}
                      </span>
                    </span>
                    <Badge variant="gold">{wo.customerFeedback.rating}/5</Badge>
                  </div>
                  {wo.customerFeedback.comment && (
                    <div className="mt-2 text-xs text-[var(--color-text-secondary)]">&ldquo;{wo.customerFeedback.comment}&rdquo;</div>
                  )}
                  <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
                    Submitted {wo.customerFeedback.submittedAt ? formatDateTime(wo.customerFeedback.submittedAt) : "—"}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
                  No rating yet. Customer will be prompted to rate after visit completion.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-[var(--color-text-primary)]">{children}</span>
    </div>
  );
}

function NoteBlock({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-xs">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{body}</div>
    </div>
  );
}

