import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder, Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { CalendarCheck, Wrench, Star } from "lucide-react";
import type { WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function PortalVisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let v;
  try {
    v = await WorkOrder.findById(id)
      .populate("unitId", "code model")
      .populate("technicianId", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!v || String(v.customerId) !== String(customer._id)) notFound();

  const unit = v.unitId as unknown as { code?: string; model?: string } | null;
  const tech = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/visits" className="text-[var(--color-text-muted)]">← Service history</Link></div>

      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-semibold">
          <CalendarCheck className="size-4 text-[var(--color-brand)]" /> Visit {formatDate(v.scheduledDate)}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{v.code}</span>
          <Badge variant="outline">{String(v.type).replace("_", " ")}</Badge>
          <WorkOrderStatusBadge status={v.status as WorkOrderStatus} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Visit details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Date"><span>{formatDate(v.scheduledDate)} at {v.scheduledTime}</span></Row>
            <Row label="Unit"><span>{unit?.model} · <span className="font-mono text-[10px]">{unit?.code}</span></span></Row>
            <Row label="Technician">{tech ? `${tech.firstName} ${tech.lastName}` : "—"}</Row>
            {v.actualStartAt && <Row label="Started">{formatDateTime(v.actualStartAt)}</Row>}
            {v.actualEndAt && <Row label="Ended">{formatDateTime(v.actualEndAt)}</Row>}
            {v.actualDurationMinutes && <Row label="Duration">{v.actualDurationMinutes} min</Row>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Report</CardTitle></CardHeader>
          <CardContent className="text-xs">
            {v.technicianNotes ? (
              <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{v.technicianNotes}</p>
            ) : (
              <p className="text-[var(--color-text-muted)]">Technician notes will appear here once the visit is complete.</p>
            )}
            {v.checklist && v.checklist.length > 0 && (
              <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
                <div className="mb-1.5 text-[10px] uppercase text-[var(--color-text-muted)]">
                  Checklist: {v.checklist.filter((c) => c.completed).length} of {v.checklist.length} complete
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {v.status === "completed" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="size-4 text-[var(--color-accent-gold)]" /> Your feedback</CardTitle></CardHeader>
          <CardContent>
            {v.customerFeedback?.rating ? (
              <div>
                <div className="text-lg text-[var(--color-accent-gold)]">
                  {"★".repeat(v.customerFeedback.rating)}<span className="text-[var(--color-text-disabled)]">{"★".repeat(5 - v.customerFeedback.rating)}</span>
                </div>
                {v.customerFeedback.comment && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">&ldquo;{v.customerFeedback.comment}&rdquo;</p>
                )}
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  Submitted {v.customerFeedback.submittedAt ? formatDate(v.customerFeedback.submittedAt) : ""}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-4 text-center">
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">How was your visit? Your feedback helps us improve.</p>
                <Button asChild>
                  <Link href={`/portal/visits/${id}/feedback`}>
                    <Star /> Rate this visit
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
