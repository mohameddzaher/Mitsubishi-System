import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Invoice, Payment } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Receipt, Calendar, User as UserIcon, QrCode, Printer } from "lucide-react";
import type { InvoiceStatus } from "@/config/constants";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let invoice;
  try {
    invoice = await Invoice.findById(id)
      .populate("customerId", "commercialName code addresses taxNumber vatNumber")
      .populate("contractId", "code type")
      .lean();
  } catch {
    notFound();
  }
  if (!invoice) notFound();

  const customer = invoice.customerId as unknown as {
    _id?: unknown;
    commercialName?: string;
    code?: string;
    addresses?: Array<{ street?: string; district?: string; city?: string }>;
    taxNumber?: string;
    vatNumber?: string;
  } | null;
  const contract = invoice.contractId as unknown as { _id?: unknown; code?: string; type?: string } | null;

  const payments = await Payment.find({ invoiceId: id, deletedAt: null })
    .sort({ receivedAt: -1 })
    .populate("receivedById", "firstName lastName")
    .lean();

  const addr = customer?.addresses?.[0];

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/finance/invoices" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All invoices
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Receipt className="size-4 text-[var(--color-brand)]" />
            <span className="font-mono">{invoice.code}</span>
            <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
          </span>
        }
        description={
          <span>
            Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">
              <Printer /> Print
            </Button>
            <Button size="sm" asChild>
              <Link href={`/finance/payments/new?invoiceId=${id}`}>+ Record payment</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total" value={formatCurrency(invoice.total)} icon={<Receipt className="size-4" />} />
        <KpiCard label="Paid" value={formatCurrency(invoice.paidAmount ?? 0)} accent="success" />
        <KpiCard label="Balance" value={formatCurrency(invoice.balance ?? 0)} accent={(invoice.balance ?? 0) > 0 ? "warning" : "default"} />
        <KpiCard
          label={invoice.agingBucket && invoice.agingBucket !== "current" ? "Days past due" : "Days to due"}
          value={invoice.agingDays > 0 ? invoice.agingDays : Math.max(0, Math.floor((new Date(invoice.dueDate).getTime() - Date.now()) / 86_400_000))}
          accent={invoice.agingDays > 60 ? "danger" : invoice.agingDays > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bill to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="text-[13px] font-semibold">{customer?.commercialName}</div>
            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{customer?.code}</div>
            {addr && (
              <div className="mt-2 text-[var(--color-text-muted)]">
                {addr.street}<br />
                {addr.district}, {addr.city}
              </div>
            )}
            {customer?.vatNumber && (
              <div className="mt-2">
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">VAT #</div>
                <div className="font-mono text-[11px]">{customer.vatNumber}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Issue date">{formatDate(invoice.issueDate)}</Row>
            <Row label="Due date">{formatDate(invoice.dueDate)}</Row>
            {invoice.periodStart && invoice.periodEnd && (
              <Row label="Service period">
                {formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}
              </Row>
            )}
            <Row label="Status"><InvoiceStatusBadge status={invoice.status as InvoiceStatus} /></Row>
            {contract && (
              <div>
                <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Contract</div>
                <Link href={`/contracts/${String(contract._id)}`} className="font-mono text-[11px] hover:text-[var(--color-text-primary)]">
                  {contract.code}
                </Link>
              </div>
            )}
            <Row label="Currency">{invoice.currency}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-4" /> ZATCA compliant
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
              <QrCode className="size-12 text-[var(--color-text-muted)]" />
            </div>
            <div className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              QR code includes seller name, VAT #, timestamp, total, and VAT amount per ZATCA Phase 2 spec.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{item.qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-[var(--color-border-subtle)] p-4">
            <div className="ml-auto max-w-xs space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">VAT (15%)</span>
                <span className="font-mono">{formatCurrency(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border-subtle)] pt-1 text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-success)]">Paid</span>
                <span className="font-mono text-[var(--color-success)]">− {formatCurrency(invoice.paidAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border-subtle)] pt-1 font-semibold">
                <span>Balance</span>
                <span className="font-mono">{formatCurrency(invoice.balance ?? 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={payments}
            getKey={(row) => String((row as { _id: unknown })._id)}
            columns={[
              { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
              { key: "amount", header: "Amount", align: "right", accessor: (r) => <span className="font-mono text-xs text-[var(--color-success)]">{formatCurrency((r as { amount: number }).amount)}</span> },
              { key: "method", header: "Method", accessor: (r) => <Badge variant="outline">{String((r as { method: string }).method).replace("_", " ")}</Badge> },
              { key: "reference", header: "Reference", accessor: (r) => <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{(r as { reference?: string }).reference ?? "—"}</span> },
              { key: "received", header: "Received", accessor: (r) => <span className="text-[11px]">{formatDateTime((r as { receivedAt: Date }).receivedAt)}</span> },
            ]}
            emptyTitle="No payments recorded yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--color-text-muted)]">{label}</div>
      <div>{children}</div>
    </div>
  );
}
