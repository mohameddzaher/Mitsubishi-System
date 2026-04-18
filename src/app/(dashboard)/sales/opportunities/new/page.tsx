import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models";
import { scopedFilter } from "@/server/filters";
import { createOpportunity } from "@/server/sales/actions";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const session = await requireSession();
  await connectDB();
  const customers = await Customer.find(scopedFilter(session, { deletedAt: null }))
    .select("commercialName code status")
    .sort({ commercialName: 1 })
    .lean();

  const options = customers.map((c) => ({
    value: String(c._id),
    label: c.commercialName,
    description: `${c.code} · ${c.status}`,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/sales/opportunities" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← Pipeline
        </Link>
      </div>
      <PageHeader title="New opportunity" description="Add a deal to the pipeline." />

      <form action={createOpportunity} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Deal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer *</Label>
              <SearchableSelect
                name="customerId"
                options={options}
                placeholder="Select customer…"
                searchPlaceholder="Search by name, code, or status"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="e.g., AMC renewal — 12 units" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="dealType">Deal type</Label>
                <select id="dealType" name="dealType" aria-label="Deal type" title="Deal type" defaultValue="amc" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                  <option value="amc">AMC</option>
                  <option value="installation">Installation</option>
                  <option value="modernization">Modernization</option>
                  <option value="repair">Repair</option>
                  <option value="upgrade">Upgrade</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stage">Stage</Label>
                <select id="stage" name="stage" aria-label="Stage" title="Stage" defaultValue="new" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="site_survey">Site survey</option>
                  <option value="quotation_prepared">Quote prepared</option>
                  <option value="quotation_sent">Quote sent</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="probability">Probability %</Label>
                <Input id="probability" name="probability" type="number" min={0} max={100} defaultValue={20} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="value">Deal value (SAR) *</Label>
                <Input id="value" name="value" type="number" min={0} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expectedCloseDate">Expected close date *</Label>
                <Input id="expectedCloseDate" name="expectedCloseDate" type="date" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/sales/opportunities">Cancel</Link></Button>
          <Button type="submit">Create opportunity</Button>
        </div>
      </form>
    </div>
  );
}
