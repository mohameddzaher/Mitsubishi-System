import { PageHeader } from "@/components/ui/page-header";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { SparePart } from "@/models";
import { scopedFilter } from "@/server/filters";
import { Package, AlertCircle, Coins, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await requireSession();
  await connectDB();

  const [parts, inventoryValue, lowStockCount] = await Promise.all([
    SparePart.find(scopedFilter(session, { deletedAt: null })).sort({ stockLevel: 1 }).limit(200).lean(),
    SparePart.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$stockLevel", "$unitCost"] } },
          totalItems: { $sum: "$stockLevel" },
          skuCount: { $sum: 1 },
        },
      },
    ]),
    SparePart.countDocuments({
      ...scopedFilter(session, { deletedAt: null }),
      $expr: { $lt: ["$stockLevel", "$reorderLevel"] },
    }),
  ]);

  const agg = inventoryValue[0] ?? { totalValue: 0, totalItems: 0, skuCount: 0 };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description={`${agg.skuCount} SKUs · ${agg.totalItems} items in stock`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total SKUs" value={agg.skuCount} icon={<Hash className="size-4" />} />
        <KpiCard label="Items in stock" value={agg.totalItems} icon={<Package className="size-4" />} accent="info" />
        <KpiCard label="Inventory value" value={formatCurrency(agg.totalValue)} icon={<Coins className="size-4" />} accent="success" />
        <KpiCard label="Low stock" value={lowStockCount} icon={<AlertCircle className="size-4" />} accent={lowStockCount > 0 ? "warning" : "default"} />
      </div>

      <SimpleTable
        data={parts}
        getKey={(row) => String((row as { _id: unknown })._id)}
        columns={[
          { key: "partNumber", header: "Part #", accessor: (r) => <span className="font-mono text-[11px]">{(r as { partNumber: string }).partNumber}</span> },
          { key: "name", header: "Name", accessor: (r) => <span className="text-xs font-medium">{(r as { name: string }).name}</span> },
          { key: "category", header: "Category", accessor: (r) => <Badge variant="outline">{(r as { category: string }).category}</Badge> },
          {
            key: "stock",
            header: "Stock",
            align: "right",
            accessor: (r) => {
              const p = r as { stockLevel: number; reorderLevel: number };
              const low = p.stockLevel < p.reorderLevel;
              return (
                <span className={`font-mono text-xs ${low ? "text-[var(--color-warning)]" : ""}`}>
                  {p.stockLevel}
                  {low && <span className="ml-1 text-[10px]">(reorder: {p.reorderLevel})</span>}
                </span>
              );
            },
          },
          {
            key: "location",
            header: "Location",
            accessor: (r) => {
              const loc = (r as { warehouseLocation?: { shelf?: string; bin?: string; zone?: string } }).warehouseLocation;
              return (
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                  {loc ? `${loc.zone ?? ""}-${loc.shelf ?? ""}-${loc.bin ?? ""}` : "—"}
                </span>
              );
            },
          },
          {
            key: "cost",
            header: "Unit cost",
            align: "right",
            accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { unitCost: number }).unitCost)}</span>,
          },
          {
            key: "value",
            header: "Stock value",
            align: "right",
            accessor: (r) => {
              const p = r as { stockLevel: number; unitCost: number };
              return <span className="font-mono text-xs">{formatCurrency(p.stockLevel * p.unitCost)}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
