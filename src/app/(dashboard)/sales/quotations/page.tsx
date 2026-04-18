import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Quotation } from "@/models";
import { scopedFilter } from "@/server/filters";
import { FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const session = await requireSession();
  await connectDB();

  const quotations = await Quotation.find(scopedFilter(session, { deletedAt: null }))
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("customerId", "commercialName code")
    .populate("preparedBy", "firstName lastName")
    .lean();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotations"
        description="Track quotes from draft to acceptance — acceptance auto-activates the customer"
        actions={
          <Button asChild>
            <Link href="/sales/quotations/new">+ New quotation</Link>
          </Button>
        }
      />

      {quotations.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-4" />}
          title="No quotations yet"
          description="When a customer is activated (via quotation acceptance), records will appear here."
          action={
            <Button asChild>
              <Link href="/sales/quotations/new">Create your first quotation</Link>
            </Button>
          }
        />
      ) : (
        <SimpleTable
          data={quotations}
          getKey={(row) => String((row as { _id: unknown })._id)}
          rowHref={(row) => `/sales/quotations/${String((row as { _id: unknown })._id)}`}
          columns={[
            { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
            {
              key: "customer",
              header: "Customer",
              accessor: (r) => {
                const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
              },
            },
            {
              key: "version",
              header: "Version",
              accessor: (r) => <Badge variant="outline">v{(r as { version: number }).version}</Badge>,
            },
            {
              key: "status",
              header: "Status",
              accessor: (r) => {
                const s = (r as { status: string }).status;
                return (
                  <Badge variant={s === "accepted" ? "success" : s === "rejected" ? "danger" : s === "sent" || s === "viewed" ? "info" : "outline"}>
                    {s}
                  </Badge>
                );
              },
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span>,
            },
            {
              key: "validUntil",
              header: "Valid until",
              accessor: (r) => {
                const d = (r as { validUntil?: Date }).validUntil;
                return d ? <span className="text-[11px]">{formatDate(d)}</span> : <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              },
            },
          ]}
        />
      )}
    </div>
  );
}
