import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Contract } from "@/models";
import { renewContract } from "@/server/contracts/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSignature } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RenewContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let contract;
  try {
    contract = await Contract.findById(id).populate("customerId", "commercialName code").lean();
  } catch {
    notFound();
  }
  if (!contract) notFound();

  const c = contract.customerId as unknown as { commercialName?: string; code?: string } | null;
  const renewWithId = renewContract.bind(null, id);

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href={`/contracts/${id}`} className="text-[var(--color-text-muted)]">← Back to contract</Link></div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FileSignature className="size-4 text-[var(--color-brand)]" /> Renew contract
          </span>
        }
        description={<span>Creating a new contract that continues from <span className="font-mono">{contract.code}</span> · {c?.commercialName}</span>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Current contract</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3">
          <Stat label="Start" value={formatDate(contract.startDate)} />
          <Stat label="End" value={formatDate(contract.endDate)} />
          <Stat label="Duration" value={`${contract.durationMonths} months`} />
          <Stat label="Current price" value={formatCurrency(contract.price)} />
          <Stat label="Current total" value={formatCurrency(contract.total)} />
          <Stat label="Units" value={contract.unitCount} />
        </CardContent>
      </Card>

      <form action={renewWithId} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>New terms</CardTitle>
            <CardDescription>Everything else carries over from the existing contract.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="durationMonths">Duration (months)</Label>
              <Input id="durationMonths" name="durationMonths" type="number" min={1} max={60} defaultValue={contract.durationMonths} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceAdjustmentPct">Price adjustment %</Label>
              <Input id="priceAdjustmentPct" name="priceAdjustmentPct" type="number" step="0.1" defaultValue={0} />
              <p className="text-[10px] text-[var(--color-text-muted)]">+5 means 5% uplift. Negative means discount.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billingCycle">Billing cycle</Label>
              <select id="billingCycle" name="billingCycle" defaultValue={contract.billingCycle} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi_annual">Semi-annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Badge variant="info">Note</Badge>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              On confirmation, we will mark the old contract as <strong>Renewed</strong> and create the new one as <strong>Active</strong> starting today.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href={`/contracts/${id}`}>Cancel</Link></Button>
          <Button type="submit">Confirm renewal</Button>
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-mono font-semibold">{value}</div>
    </div>
  );
}
