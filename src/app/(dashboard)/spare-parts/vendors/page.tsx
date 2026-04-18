import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Vendor, PurchaseOrder } from "@/models";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  await requireSession();
  await connectDB();
  const vendors = await Vendor.find({ deletedAt: null }).sort({ name: 1 }).lean();

  const poStats = await PurchaseOrder.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$vendorId", count: { $sum: 1 }, totalValue: { $sum: "$total" } } },
  ]);
  const poMap = new Map<string, { count: number; totalValue: number }>(poStats.map((p) => [String(p._id), { count: p.count, totalValue: p.totalValue }]));

  return (
    <div className="space-y-5">
      <PageHeader title="Vendors" description={`${vendors.length} vendors on record`} />
      <SimpleTable
        data={vendors}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/spare-parts/vendors/${String((row as { _id: unknown })._id)}`}
        columns={[
          { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
          { key: "name", header: "Name", accessor: (r) => <span className="text-xs font-medium">{(r as { name: string }).name}</span> },
          {
            key: "rating",
            header: "Rating",
            accessor: (r) => {
              const rating = (r as { rating: number }).rating ?? 0;
              return <span className="text-[var(--color-accent-gold)]">{"★".repeat(rating)}<span className="text-[var(--color-text-disabled)]">{"★".repeat(5 - rating)}</span></span>;
            },
          },
          { key: "leadTime", header: "Lead time", accessor: (r) => <span className="text-xs">{(r as { avgLeadTimeDays: number }).avgLeadTimeDays}d</span> },
          { key: "terms", header: "Payment", accessor: (r) => <Badge variant="outline">{(r as { paymentTerms: string }).paymentTerms}</Badge> },
          {
            key: "pos",
            header: "Active POs",
            align: "right",
            accessor: (r) => {
              const stats = poMap.get(String((r as { _id: unknown })._id)) ?? { count: 0, totalValue: 0 };
              return <span className="font-mono text-xs">{stats.count}</span>;
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (r) => (
              <Badge variant={(r as { activeStatus?: boolean }).activeStatus ? "success" : "outline"}>
                {(r as { activeStatus?: boolean }).activeStatus ? "Active" : "Inactive"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
