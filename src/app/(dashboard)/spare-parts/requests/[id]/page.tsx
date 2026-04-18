import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { SparePartRequest, Quotation } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { PackageSearch } from "lucide-react";
import { SparePartActions } from "./spare-part-actions";
import { UserRole } from "@/config/roles";

export const dynamic = "force-dynamic";

export default async function SparePartRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  let req;
  try {
    req = await SparePartRequest.findById(id)
      .populate("partId", "partNumber name category unitCost sellingPrice stockLevel")
      .populate("technicianId", "firstName lastName")
      .populate("customerId", "commercialName code")
      .populate("workOrderId", "code")
      .populate("unitId", "code model")
      .populate("timeline.byId", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!req) notFound();

  const linkedQuotation = await Quotation.findOne({
    sourceSparePartRequestIds: req._id,
    deletedAt: null,
  })
    .select("code status total")
    .lean();

  const part = req.partId as unknown as { name?: string; partNumber?: string; category?: string; unitCost?: number; sellingPrice?: number; stockLevel?: number } | null;
  const tech = req.technicianId as unknown as { firstName?: string; lastName?: string } | null;
  const cust = req.customerId as unknown as { _id?: unknown; commercialName?: string; code?: string } | null;
  const wo = req.workOrderId as unknown as { _id?: unknown; code?: string } | null;
  const unit = req.unitId as unknown as { _id?: unknown; code?: string; model?: string } | null;

  const canApprove =
    req.status === "pending_manager_approval" &&
    [UserRole.SERVICE_MANAGER, UserRole.HEAD_OF_SERVICE, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN].includes(session.user.role);

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/spare-parts/requests" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All requests
        </Link>
      </div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <PackageSearch className="size-4 text-[var(--color-brand)]" />
            <span className="font-mono">{req.code}</span>
            <Badge variant={req.priority === "urgent" ? "danger" : req.priority === "scheduled" ? "outline" : "info"}>{req.priority}</Badge>
            <Badge variant={req.status === "installed" ? "success" : req.status === "rejected" ? "danger" : "info"}>{String(req.status).replace(/_/g, " ")}</Badge>
          </span>
        }
        actions={canApprove ? <SparePartActions requestId={id} /> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Part & quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Part">{part?.name ?? req.partNameSnapshot ?? "—"}</Row>
            <Row label="Part number" mono>{part?.partNumber ?? "—"}</Row>
            <Row label="Category">{part?.category ?? "—"}</Row>
            <Row label="Qty requested">{req.qty}</Row>
            <Row label="Stock available">{part?.stockLevel ?? "—"}</Row>
            <Row label="Unit cost">{part?.unitCost ?? "—"} SAR</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Technician">{tech ? `${tech.firstName} ${tech.lastName}` : "—"}</Row>
            {cust && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Customer</div>
                <Link href={`/customers/${String(cust._id)}`} className="hover:text-[var(--color-text-primary)]">
                  {cust.commercialName}
                </Link>
              </div>
            )}
            {wo && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Work order</div>
                <Link href={`/service/work-orders/${String(wo._id)}`} className="font-mono text-[11px] hover:text-[var(--color-text-primary)]">
                  {wo.code}
                </Link>
              </div>
            )}
            {unit && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Unit</div>
                <Link href={`/units/${String(unit._id)}`} className="hover:text-[var(--color-text-primary)]">
                  {unit.model} · <span className="font-mono text-[10px]">{unit.code}</span>
                </Link>
              </div>
            )}
            {req.reason && <Row label="Reason">{req.reason}</Row>}
            {linkedQuotation && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Quotation</div>
                <Link
                  href={`/sales/quotations/${String(linkedQuotation._id)}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--color-text-primary)]"
                >
                  <span className="font-mono text-[11px]">{linkedQuotation.code}</span>
                  <Badge
                    variant={
                      linkedQuotation.status === "accepted"
                        ? "success"
                        : linkedQuotation.status === "sent" || linkedQuotation.status === "viewed"
                          ? "info"
                          : "outline"
                    }
                  >
                    {linkedQuotation.status}
                  </Badge>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{linkedQuotation.total} SAR</span>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {req.timeline.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)]">No events.</div>
          ) : (
            <ol className="space-y-3">
              {req.timeline.map((ev, i) => {
                const by = ev.byId as unknown as { firstName?: string; lastName?: string } | null;
                return (
                  <li key={i} className="relative flex gap-3 border-l-2 border-[var(--color-border-subtle)] pb-3 pl-4">
                    <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-[var(--color-bg-base)] bg-[var(--color-brand)]" />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Badge variant="outline">{ev.status.replace(/_/g, " ")}</Badge>
                        <span className="text-[var(--color-text-muted)]">{relativeTime(ev.at)}</span>
                      </div>
                      {by && <div className="mt-0.5">{by.firstName} {by.lastName}</div>}
                      {ev.note && <div className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{ev.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className={mono ? "font-mono text-[11px]" : ""}>{children}</span>
    </div>
  );
}
