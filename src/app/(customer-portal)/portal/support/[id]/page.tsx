import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Dispute, Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let dispute;
  try {
    dispute = await Dispute.findById(id).lean();
  } catch {
    notFound();
  }
  if (!dispute || String(dispute.customerId) !== String(customer._id)) notFound();

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/support" className="text-[var(--color-text-muted)]">← Support</Link></div>

      <div>
        <h1 className="text-[18px] font-semibold">{dispute.title}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{dispute.code}</span>
          <Badge variant={dispute.status === "resolved" ? "success" : dispute.status === "escalated" ? "danger" : "info"}>{dispute.status}</Badge>
          <Badge variant={dispute.severity === "critical" ? "danger" : dispute.severity === "high" ? "warning" : "outline"}>{dispute.severity}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Your report</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{dispute.description || "—"}</p>
          <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">Submitted {formatDateTime(dispute.createdAt ?? new Date())}</div>
        </CardContent>
      </Card>

      {dispute.resolutionSummary && (
        <Card className="border-[var(--color-success)]/30 bg-[rgba(16,185,129,0.05)]">
          <CardHeader><CardTitle className="text-[var(--color-success)]">Resolution</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{dispute.resolutionSummary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent>
          {dispute.timeline.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)]">No updates yet. We will keep you posted.</div>
          ) : (
            <ol className="space-y-2">
              {dispute.timeline.map((ev, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ev.type.replace("_", " ")}</Badge>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{relativeTime(ev.at)}</span>
                  </div>
                  {ev.note && <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">{ev.note}</div>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
