import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models";
import { scopedFilter } from "@/server/filters";
import { createInvoice } from "@/server/finance/actions";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ customerId?: string; contractId?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const customers = await Customer.find(scopedFilter(session, { deletedAt: null, status: "active" }))
    .select("commercialName code")
    .sort({ commercialName: 1 })
    .lean();

  const options = customers.map((c) => ({
    value: String(c._id),
    label: c.commercialName,
    description: c.code,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/finance/invoices" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">← All invoices</Link></div>
      <PageHeader title="New invoice" description="ZATCA-compliant invoice with 15% VAT." />

      <form action={createInvoice} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer *</Label>
              <SearchableSelect
                name="customerId"
                options={options}
                defaultValue={sp.customerId ?? ""}
                placeholder="Select customer…"
                searchPlaceholder="Search by name or code"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Line item</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required placeholder="e.g., AMC Q1 2026 — 12 units" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="qty">Qty *</Label>
                <Input id="qty" name="qty" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">Unit price (SAR) *</Label>
                <Input id="unitPrice" name="unitPrice" type="number" min={0} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueInDays">Due in (days)</Label>
                <Input id="dueInDays" name="dueInDays" type="number" min={1} defaultValue={30} />
              </div>
            </div>
            {sp.contractId && <input type="hidden" name="contractId" value={sp.contractId} />}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/finance/invoices">Cancel</Link></Button>
          <Button type="submit">Issue invoice</Button>
        </div>
      </form>
    </div>
  );
}
