import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  await requireSession();
  await connectDB();

  const logs = await AuditLog.find({}).sort({ at: -1 }).limit(200).lean();

  if (logs.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title="Audit log" description="Immutable record of every critical action" />
        <EmptyState
          icon={<ScrollText className="size-4" />}
          title="No audit entries yet"
          description="Audit log records every mutation across the system (create/update/delete/approve/sign). Take any action to populate this page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Audit log" description={`${logs.length} most recent entries · immutable`} />
      <SimpleTable
        data={logs}
        getKey={(row) => String((row as { _id: unknown })._id)}
        columns={[
          {
            key: "at",
            header: "When",
            accessor: (r) => <span className="text-[11px]">{formatDateTime((r as { at: Date }).at)}</span>,
          },
          {
            key: "user",
            header: "User",
            accessor: (r) => <span className="text-xs">{(r as { userName?: string }).userName ?? "—"}</span>,
          },
          {
            key: "action",
            header: "Action",
            accessor: (r) => <Badge variant="outline">{(r as { action: string }).action}</Badge>,
          },
          {
            key: "resource",
            header: "Resource",
            accessor: (r) => (
              <span className="font-mono text-[11px]">
                {(r as { resource: string }).resource}
                {(r as { resourceLabel?: string }).resourceLabel && <span className="ml-1 text-[var(--color-text-muted)]">({(r as { resourceLabel: string }).resourceLabel})</span>}
              </span>
            ),
          },
          {
            key: "ip",
            header: "IP",
            accessor: (r) => <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{(r as { ip?: string }).ip ?? "—"}</span>,
          },
        ]}
      />
    </div>
  );
}
