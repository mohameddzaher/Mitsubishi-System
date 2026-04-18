import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let payment;
  try {
    payment = await Payment.findById(id)
      .populate("customerId", "commercialName code")
      .populate("invoiceId", "code total balance")
      .populate("receivedById", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!payment) notFound();

  const c = payment.customerId as unknown as { _id?: unknown; commercialName?: string; code?: string } | null;
  const inv = payment.invoiceId as unknown as { _id?: unknown; code?: string; total?: number; balance?: number } | null;
  const by = payment.receivedById as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/finance/payments" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All payments
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-[var(--color-success)]" />
            <span className="font-mono">{payment.code}</span>
          </span>
        }
        description={`Payment of ${formatCurrency(payment.amount)} received ${formatDateTime(payment.receivedAt)}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Amount">
            <span className="font-mono text-lg font-semibold text-[var(--color-success)]">{formatCurrency(payment.amount)}</span>
          </Row>
          <Row label="Method"><Badge variant="outline">{String(payment.method).replace("_", " ")}</Badge></Row>
          <Row label="Reference"><span className="font-mono text-xs">{payment.reference || "—"}</span></Row>
          {c && (
            <Row label="Customer">
              <Link href={`/customers/${String(c._id)}`} className="hover:text-[var(--color-text-primary)]">
                {c.commercialName} · {c.code}
              </Link>
            </Row>
          )}
          {inv && (
            <Row label="Invoice">
              <Link href={`/finance/invoices/${String(inv._id)}`} className="font-mono text-xs hover:text-[var(--color-text-primary)]">
                {inv.code}
              </Link>
            </Row>
          )}
          <Row label="Received by">{by ? `${by.firstName} ${by.lastName}` : "—"}</Row>
          <Row label="Received at">{formatDateTime(payment.receivedAt)}</Row>
          <Row label="Reconciled">{payment.reconciled ? "Yes" : "No"}</Row>
          {payment.notes && <Row label="Notes">{payment.notes}</Row>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
