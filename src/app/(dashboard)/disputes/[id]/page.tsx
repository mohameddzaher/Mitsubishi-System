import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Dispute } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let dispute;
  try {
    dispute = await Dispute.findById(id)
      .populate("raisedById", "firstName lastName")
      .populate("currentAssigneeId", "firstName lastName")
      .populate("customerId", "commercialName code")
      .populate("timeline.fromUserId", "firstName lastName")
      .populate("timeline.toUserId", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!dispute) notFound();

  const raiser = dispute.raisedById as unknown as { firstName?: string; lastName?: string } | null;
  const assignee = dispute.currentAssigneeId as unknown as { firstName?: string; lastName?: string } | null;
  const customer = dispute.customerId as unknown as { _id?: unknown; commercialName?: string; code?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/disputes" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All disputes
        </Link>
      </div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="size-4 text-[var(--color-warning)]" />
            <span>{dispute.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px]">{dispute.code}</span>
            <Badge variant={dispute.severity === "critical" ? "danger" : dispute.severity === "high" ? "warning" : "outline"}>{dispute.severity}</Badge>
            <Badge variant={dispute.status === "resolved" || dispute.status === "closed" ? "success" : dispute.status === "escalated" ? "danger" : "info"}>
              {dispute.status}
            </Badge>
            <Badge variant="outline">{String(dispute.category).replace(/_/g, " ")}</Badge>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
              {dispute.description || "No description provided."}
            </p>
            {dispute.resolutionSummary && (
              <div className="mt-4 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] p-3">
                <div className="text-[10px] uppercase text-[var(--color-success)]">Resolution summary</div>
                <div className="mt-1 text-xs">{dispute.resolutionSummary}</div>
                {dispute.rootCause && (
                  <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                    <span className="font-semibold">Root cause:</span> {dispute.rootCause}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Raised by">{raiser ? `${raiser.firstName} ${raiser.lastName}` : "—"}</Row>
            <Row label="Current assignee">{assignee ? `${assignee.firstName} ${assignee.lastName}` : "Unassigned"}</Row>
            {customer && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Customer</div>
                <Link href={`/customers/${String(customer._id)}`} className="text-xs hover:text-[var(--color-text-primary)]">
                  {customer.commercialName} · {customer.code}
                </Link>
              </div>
            )}
            <Row label="SLA target">{dispute.slaTargetHours} hours</Row>
            <Row label="SLA breached">{dispute.slaBreached ? "Yes" : "No"}</Row>
            <Row label="Created">{relativeTime(dispute.createdAt ?? new Date())}</Row>
            {dispute.resolvedAt && <Row label="Resolved">{formatDateTime(dispute.resolvedAt)}</Row>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {dispute.timeline.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
              No timeline events yet.
            </div>
          ) : (
            <ol className="space-y-3">
              {dispute.timeline.map((ev, i) => {
                const from = ev.fromUserId as unknown as { firstName?: string; lastName?: string } | null;
                const to = ev.toUserId as unknown as { firstName?: string; lastName?: string } | null;
                return (
                  <li key={i} className="relative flex gap-3 border-l-2 border-[var(--color-border-subtle)] pb-3 pl-4 last:pb-0">
                    <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-[var(--color-bg-base)] bg-[var(--color-brand)]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px]">
                        <Badge variant="outline">{ev.type.replace("_", " ")}</Badge>
                        <span className="ml-2 text-[var(--color-text-muted)]">· {relativeTime(ev.at)}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        {from && <span>{from.firstName} {from.lastName}</span>}
                        {to && <span className="text-[var(--color-text-muted)]"> → {to.firstName} {to.lastName}</span>}
                      </div>
                      {ev.note && (
                        <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{ev.note}</div>
                      )}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--color-text-muted)]">{label}</div>
      <div>{children}</div>
    </div>
  );
}
