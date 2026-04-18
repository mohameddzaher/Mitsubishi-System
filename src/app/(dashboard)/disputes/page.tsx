import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Dispute } from "@/models";
import { scopedFilter } from "@/server/filters";
import { AlertTriangle, Search, CheckCircle2, TrendingUp } from "lucide-react";
import { formatDate, relativeTime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string; open?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) {
    filter.status = sp.status;
  } else if (sp.open === "true" || sp.open === "1") {
    filter.status = { $in: ["open", "investigating", "escalated"] };
  }
  if (sp.severity) filter.severity = sp.severity;

  const [disputes, stats] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("raisedById", "firstName lastName")
      .populate("currentAssigneeId", "firstName lastName")
      .populate("customerId", "commercialName")
      .lean(),
    Dispute.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s.count]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disputes"
        description="Internal and customer-raised issues, forwarding trail preserved"
        actions={
          <Button asChild>
            <Link href="/disputes/new">+ Raise dispute</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open" value={statMap.get("open") ?? 0} icon={<AlertTriangle className="size-4" />} accent="warning" />
        <KpiCard label="Investigating" value={statMap.get("investigating") ?? 0} icon={<Search className="size-4" />} accent="info" />
        <KpiCard label="Escalated" value={statMap.get("escalated") ?? 0} icon={<TrendingUp className="size-4" />} accent="danger" />
        <KpiCard label="Resolved" value={(statMap.get("resolved") ?? 0) + (statMap.get("closed") ?? 0)} icon={<CheckCircle2 className="size-4" />} accent="success" />
      </div>

      <SimpleTable
        data={disputes}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/disputes/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          {
            key: "title",
            header: "Title",
            accessor: (r) => (
              <span className="text-xs font-medium">{(r as { title: string }).title}</span>
            ),
          },
          {
            key: "category",
            header: "Category",
            accessor: (r) => (
              <Badge variant="outline">{String((r as { category: string }).category).replace(/_/g, " ")}</Badge>
            ),
          },
          {
            key: "severity",
            header: "Severity",
            accessor: (r) => {
              const s = (r as { severity: string }).severity;
              return (
                <Badge variant={s === "critical" ? "danger" : s === "high" ? "warning" : s === "low" ? "outline" : "info"}>
                  {s}
                </Badge>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => {
              const s = (r as { status: string }).status;
              return (
                <Badge
                  variant={
                    s === "resolved" || s === "closed"
                      ? "success"
                      : s === "escalated"
                        ? "danger"
                        : s === "investigating"
                          ? "info"
                          : "warning"
                  }
                >
                  {s}
                </Badge>
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
            key: "assignee",
            header: "Assignee",
            accessor: (r) => {
              const a = (r as { currentAssigneeId: { firstName?: string; lastName?: string } | null }).currentAssigneeId;
              return (
                <span className="text-xs">
                  {a ? `${a.firstName} ${a.lastName}` : <span className="text-[var(--color-text-muted)]">Unassigned</span>}
                </span>
              );
            },
          },
          {
            key: "created",
            header: "Created",
            accessor: (r) => (
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                {relativeTime((r as { createdAt: Date }).createdAt)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
