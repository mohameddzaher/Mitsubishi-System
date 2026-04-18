import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Vendor, PurchaseOrder } from "@/models";
import { SimpleTable } from "@/components/data-table/simple-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Phone, Mail, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let vendor;
  try {
    vendor = await Vendor.findById(id).lean();
  } catch {
    notFound();
  }
  if (!vendor) notFound();

  const pos = await PurchaseOrder.find({ vendorId: id, deletedAt: null }).sort({ createdAt: -1 }).limit(20).lean();

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/spare-parts/vendors" className="text-[var(--color-text-muted)]">← All vendors</Link></div>
      <PageHeader
        title={vendor.name}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px]">{vendor.code}</span>
            <Badge variant={vendor.activeStatus ? "success" : "outline"}>{vendor.activeStatus ? "Active" : "Inactive"}</Badge>
            <span className="text-[var(--color-accent-gold)]">{"★".repeat(vendor.rating ?? 0)}</span>
          </span>
        }
      />

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          {vendor.contactName && <div>Contact: {vendor.contactName}</div>}
          {vendor.phone && <div className="flex items-center gap-1"><Phone className="size-3" /> {vendor.phone}</div>}
          {vendor.email && <div className="flex items-center gap-1"><Mail className="size-3" /> {vendor.email}</div>}
          {vendor.address && <div className="flex items-center gap-1"><MapPin className="size-3" /> {vendor.address}</div>}
          <div>Payment terms: {vendor.paymentTerms}</div>
          <div>Avg lead time: {vendor.avgLeadTimeDays} days</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent purchase orders ({pos.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={pos}
            getKey={(row) => String((row as { _id: unknown })._id)}
            columns={[
              { key: "code", header: "PO #", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
              { key: "status", header: "Status", accessor: (r) => <Badge variant={(r as { status: string }).status === "received" ? "success" : "info"}>{(r as { status: string }).status.replace(/_/g, " ")}</Badge> },
              { key: "total", header: "Total", align: "right", accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span> },
              { key: "expected", header: "Expected", accessor: (r) => <span className="text-[11px]">{(r as { expectedDeliveryAt?: Date }).expectedDeliveryAt ? formatDate((r as { expectedDeliveryAt: Date }).expectedDeliveryAt) : "—"}</span> },
            ]}
            emptyTitle="No POs yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
