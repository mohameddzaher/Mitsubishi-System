import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { PurchaseOrder } from "@/models";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let po;
  try {
    po = await PurchaseOrder.findById(id)
      .populate("vendorId", "name code")
      .populate("requestedById", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!po) notFound();

  const vendor = po.vendorId as unknown as { _id?: unknown; name?: string; code?: string } | null;
  const req = po.requestedById as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/spare-parts/procurement" className="text-[var(--color-text-muted)]">← Procurement</Link></div>
      <PageHeader
        title={<span className="flex items-center gap-2"><span className="font-mono">{po.code}</span><Badge variant={po.status === "received" ? "success" : "info"}>{po.status.replace(/_/g, " ")}</Badge></span>}
        description={vendor ? <Link href={`/spare-parts/vendors/${String(vendor._id)}`} className="hover:text-[var(--color-text-primary)]">{vendor.name} · {vendor.code}</Link> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Part #</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="font-mono text-[11px]">{item.partNumber || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.qty}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.receivedQty}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Subtotal">{formatCurrency(po.subtotal)}</Row>
            <Row label="VAT">{formatCurrency(po.vatAmount)}</Row>
            <Row label="Total" bold>{formatCurrency(po.total)}</Row>
            <Row label="Status">{po.status}</Row>
            <Row label="Expected delivery">{po.expectedDeliveryAt ? formatDate(po.expectedDeliveryAt) : "—"}</Row>
            <Row label="Received at">{po.receivedAt ? formatDate(po.receivedAt) : "—"}</Row>
            <Row label="Requested by">{req ? `${req.firstName} ${req.lastName}` : "—"}</Row>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children, bold }: { label: string; children: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0 ${bold ? "font-semibold" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
