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
import { Invoice } from "@/models";
import { scopedFilter } from "@/server/filters";
import { recordPayment } from "@/server/finance/actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<{ invoiceId?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const openInvoices = await Invoice.find(
    scopedFilter(session, {
      status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] },
      deletedAt: null,
    }),
  )
    .populate("customerId", "commercialName")
    .sort({ dueDate: 1 })
    .lean();

  const options = openInvoices.map((inv) => {
    const c = inv.customerId as unknown as { commercialName?: string } | null;
    return {
      value: String(inv._id),
      label: `${inv.code} · ${formatCurrency(inv.balance ?? 0)} balance`,
      description: `${c?.commercialName ?? "—"} · Due ${formatDate(inv.dueDate)} · ${inv.status}`,
    };
  });

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/finance/payments" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">← All payments</Link></div>
      <PageHeader title="Record payment" description="Apply payment to an outstanding invoice." />

      <form action={recordPayment} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invoiceId">Invoice *</Label>
              <SearchableSelect
                name="invoiceId"
                options={options}
                defaultValue={sp.invoiceId ?? ""}
                placeholder="Select invoice…"
                searchPlaceholder="Search by invoice # or customer name"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (SAR) *</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="method">Method *</Label>
                <select id="method" name="method" aria-label="Payment method" title="Payment method" required defaultValue="bank_transfer" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit card</option>
                  <option value="mada">Mada</option>
                  <option value="stc_pay">STC Pay</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference / transaction ID</Label>
              <Input id="reference" name="reference" placeholder="Bank ref, cheque #, etc." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/finance/payments">Cancel</Link></Button>
          <Button type="submit">Record payment</Button>
        </div>
      </form>
    </div>
  );
}
