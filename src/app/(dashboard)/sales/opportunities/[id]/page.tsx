import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Opportunity } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import { TrendingUp, Phone, Mail, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let opp;
  try {
    opp = await Opportunity.findById(id)
      .populate("customerId", "commercialName code")
      .populate("ownerId", "firstName lastName")
      .populate("activities.userId", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!opp) notFound();

  const c = opp.customerId as unknown as { _id?: unknown; commercialName?: string; code?: string } | null;
  const owner = opp.ownerId as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/sales/opportunities" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← Pipeline
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[var(--color-brand)]" />
            <span>{opp.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={opp.stage === "won" ? "success" : opp.stage === "lost" ? "danger" : "info"}>{String(opp.stage).replace("_", " ")}</Badge>
            <Badge variant="outline">{opp.dealType}</Badge>
            <span>· {formatCurrency(opp.value)}</span>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deal info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Value">{formatCurrency(opp.value)}</Row>
            <Row label="Probability">{opp.probability}%</Row>
            <Row label="Weighted forecast">{formatCurrency(Math.round((opp.value * opp.probability) / 100))}</Row>
            <Row label="Expected close">{opp.expectedCloseDate ? formatDate(opp.expectedCloseDate) : "—"}</Row>
            <Row label="Actual close">{opp.actualCloseDate ? formatDate(opp.actualCloseDate) : "—"}</Row>
            <Row label="Owner">{owner ? `${owner.firstName} ${owner.lastName}` : "—"}</Row>
            {opp.lossReason && <Row label="Loss reason">{opp.lossReason}</Row>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {c ? (
              <Link href={`/customers/${String(c._id)}`} className="block hover:text-[var(--color-text-primary)]">
                <div className="text-[13px] font-medium">{c.commercialName}</div>
                <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{c.code}</div>
              </Link>
            ) : (
              <span className="text-[var(--color-text-muted)]">No customer linked</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity ({opp.activities?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!opp.activities || opp.activities.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
              No activity logged yet.
            </div>
          ) : (
            <ol className="space-y-3">
              {opp.activities.map((a, i) => {
                const u = a.userId as unknown as { firstName?: string; lastName?: string } | null;
                return (
                  <li key={i} className="relative flex gap-3 border-l-2 border-[var(--color-border-subtle)] pb-3 pl-4">
                    <span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-[var(--color-bg-base)] bg-[var(--color-brand)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Badge variant="outline">{a.type}</Badge>
                        <span className="text-[var(--color-text-muted)]">{relativeTime(a.date)}</span>
                        {a.durationMinutes ? <span className="text-[var(--color-text-muted)]">· {a.durationMinutes}min</span> : null}
                      </div>
                      <div className="mt-1 text-xs">
                        {u && <span className="font-medium">{u.firstName} {u.lastName}</span>}
                      </div>
                      {a.notes && <div className="mt-0.5 whitespace-pre-wrap text-[11px] text-[var(--color-text-secondary)]">{a.notes}</div>}
                      {a.outcome && <div className="mt-1 text-[10px] text-[var(--color-text-muted)]"><strong>Outcome:</strong> {a.outcome}</div>}
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
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
