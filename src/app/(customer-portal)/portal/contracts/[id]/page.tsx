import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Contract, Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSignature } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let contract;
  try {
    contract = await Contract.findById(id).lean();
  } catch {
    notFound();
  }
  if (!contract || String(contract.customerId) !== String(customer._id)) notFound();

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/contracts" className="text-[var(--color-text-muted)]">← My contracts</Link></div>

      <div>
        <h1 className="flex items-center gap-2 text-[18px] font-semibold">
          <FileSignature className="size-4 text-[var(--color-brand)]" /> <span className="font-mono">{contract.code}</span>
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{String(contract.type).replace(/_/g, " ")}</Badge>
          <Badge variant={contract.status === "active" ? "success" : "outline"}>{String(contract.status).replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Terms</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Start">{formatDate(contract.startDate)}</Row>
          <Row label="End">{formatDate(contract.endDate)}</Row>
          <Row label="Units covered">{contract.unitCount}</Row>
          <Row label="Visit frequency">{contract.visitFrequency}</Row>
          <Row label="Billing cycle">{String(contract.billingCycle).replace("_", " ")}</Row>
          <Row label="Total contract value">{formatCurrency(contract.total)}</Row>
          <Row label="Response SLA">{contract.sla?.responseTimeMinutes} min</Row>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
