import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { PromiseToPay } from "@/models";
import { scopedFilter } from "@/server/filters";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PromisesToPayPage() {
  const session = await requireSession();
  await connectDB();

  const ptps = await PromiseToPay.find(scopedFilter(session, {}))
    .sort({ promisedDate: 1 })
    .populate("customerId", "commercialName")
    .populate("invoiceId", "code")
    .populate("collectionOfficerId", "firstName lastName")
    .lean();

  return (
    <div className="space-y-5">
      <PageHeader title="Promises to pay" description={`${ptps.length} commitments tracked`} />
      <SimpleTable
        data={ptps}
        getKey={(row) => String((row as { _id: unknown })._id)}
        columns={[
          {
            key: "customer",
            header: "Customer",
            accessor: (r) => {
              const c = (r as { customerId: { commercialName?: string } | null }).customerId;
              return <span className="text-xs font-medium">{c?.commercialName ?? "—"}</span>;
            },
          },
          {
            key: "invoice",
            header: "Invoice",
            accessor: (r) => {
              const inv = (r as { invoiceId: { code?: string } | null }).invoiceId;
              return <span className="font-mono text-[11px]">{inv?.code ?? "—"}</span>;
            },
          },
          { key: "amount", header: "Amount", align: "right", accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { amount: number }).amount)}</span> },
          { key: "promised", header: "Promised", accessor: (r) => <span className="text-[11px]">{formatDate((r as { promisedDate: Date }).promisedDate)}</span> },
          {
            key: "status",
            header: "Status",
            accessor: (r) => {
              const s = (r as { status: string }).status;
              return <Badge variant={s === "kept" ? "success" : s === "broken" ? "danger" : s === "cancelled" ? "outline" : "info"}>{s}</Badge>;
            },
          },
          {
            key: "officer",
            header: "Officer",
            accessor: (r) => {
              const o = (r as { collectionOfficerId: { firstName?: string; lastName?: string } | null }).collectionOfficerId;
              return <span className="text-xs">{o ? `${o.firstName} ${o.lastName}` : "—"}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
