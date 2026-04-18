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
import { User, Customer } from "@/models";
import { createDispute } from "@/server/disputes/actions";
import { scopedFilter } from "@/server/filters";
import { ROLE_LABELS } from "@/config/roles";

export const dynamic = "force-dynamic";

export default async function NewDisputePage() {
  const session = await requireSession();
  await connectDB();

  const [users, customers] = await Promise.all([
    User.find({ branchId: session.user.branchId, status: "active", deletedAt: null })
      .select("firstName lastName role")
      .sort({ firstName: 1 })
      .lean(),
    Customer.find(scopedFilter(session, { deletedAt: null }))
      .select("commercialName code")
      .sort({ commercialName: 1 })
      .lean(),
  ]);

  const userOptions = users.map((u) => ({
    value: String(u._id),
    label: `${u.firstName} ${u.lastName}`,
    description: ROLE_LABELS[u.role] ?? u.role,
  }));
  const customerOptions = customers.map((c) => ({
    value: String(c._id),
    label: c.commercialName,
    description: c.code,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/disputes" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All disputes
        </Link>
      </div>
      <PageHeader title="Raise dispute" description="Log an issue, complaint, or escalation." />

      <form action={createDispute} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Dispute details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="Short summary of the issue" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="What happened, when, impact…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <select id="category" name="category" aria-label="Category" title="Category" required className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                  <option value="customer_complaint">Customer complaint</option>
                  <option value="payment_dispute">Payment dispute</option>
                  <option value="quality_issue">Quality issue</option>
                  <option value="technician_issue">Technician issue</option>
                  <option value="vendor_issue">Vendor issue</option>
                  <option value="internal">Internal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity *</Label>
                <select id="severity" name="severity" aria-label="Severity" title="Severity" required defaultValue="medium" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customerId">Related customer</Label>
                <SearchableSelect
                  name="customerId"
                  options={customerOptions}
                  placeholder="None"
                  searchPlaceholder="Search customers"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assigneeId">Assign to</Label>
                <SearchableSelect
                  name="assigneeId"
                  options={userOptions}
                  placeholder="Auto-assign later"
                  searchPlaceholder="Search by name or role"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/disputes">Cancel</Link></Button>
          <Button type="submit">Raise dispute</Button>
        </div>
      </form>
    </div>
  );
}
