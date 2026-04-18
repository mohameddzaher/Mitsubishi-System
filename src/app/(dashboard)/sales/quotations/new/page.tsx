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
import { createQuotation } from "@/server/sales/actions";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();
  const customers = await Customer.find(scopedFilter(session, { deletedAt: null }))
    .select("commercialName code status type")
    .sort({ commercialName: 1 })
    .lean();

  const options = customers.map((c) => ({
    value: String(c._id),
    label: c.commercialName,
    description: `${c.code} · ${c.status} · ${c.type}`,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/sales/quotations" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All quotations
        </Link>
      </div>
      <PageHeader title="New quotation" description="Prepare a quote. When accepted, the customer auto-activates and a contract is generated." />

      <form action={createQuotation} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Customer & contract</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer *</Label>
              <SearchableSelect
                name="customerId"
                options={options}
                defaultValue={sp.customerId ?? ""}
                placeholder="Select customer…"
                searchPlaceholder="Search by name, code, or status"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractType">Contract type</Label>
              <select id="contractType" name="contractType" aria-label="Contract type" title="Contract type" defaultValue="amc_comprehensive" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="amc_comprehensive">AMC Comprehensive</option>
                <option value="amc_non_comprehensive">AMC Non-Comprehensive</option>
                <option value="amc_semi">AMC Semi-Comprehensive</option>
                <option value="installation">New Installation</option>
                <option value="modernization">Modernization</option>
                <option value="one_time_repair">One-Time Repair</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" required placeholder="e.g., Annual AMC coverage for 12 units" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="qty">Quantity *</Label>
                <Input id="qty" name="qty" type="number" min={1} required defaultValue={1} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">Unit price (SAR) *</Label>
                <Input id="unitPrice" name="unitPrice" type="number" min={0} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validityDays">Valid for (days)</Label>
                <Input id="validityDays" name="validityDays" type="number" min={1} defaultValue={30} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Internal notes / delivery terms" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/sales/quotations">Cancel</Link></Button>
          <Button type="submit">Create quotation</Button>
        </div>
      </form>
    </div>
  );
}
