import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Invoice, Customer, Payment } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Printer, QrCode } from "lucide-react";
import type { InvoiceStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function PortalInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let inv;
  try {
    inv = await Invoice.findById(id).lean();
  } catch {
    notFound();
  }
  if (!inv || String(inv.customerId) !== String(customer._id)) notFound();

  const payments = await Payment.find({ invoiceId: id }).sort({ receivedAt: -1 }).lean();

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/portal/invoices" className="text-[var(--color-text-muted)]">← All invoices</Link></div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-semibold"><Receipt className="size-4 text-[var(--color-brand)]" /> <span className="font-mono">{inv.code}</span></h1>
          <div className="mt-1"><InvoiceStatusBadge status={inv.status as InvoiceStatus} /></div>
        </div>
        <Button variant="secondary" size="sm"><Printer /> Print</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Issued">{formatDate(inv.issueDate)}</Row>
            <Row label="Due">{formatDate(inv.dueDate)}</Row>
            <Row label="Total">{formatCurrency(inv.total)}</Row>
            <Row label="Paid">{formatCurrency(inv.paidAmount ?? 0)}</Row>
            <Row label="Balance"><span className="font-semibold">{formatCurrency(inv.balance ?? 0)}</span></Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="size-4" /> ZATCA QR</CardTitle></CardHeader>
          <CardContent>
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
              <QrCode className="size-12 text-[var(--color-text-muted)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {inv.items.map((item, i) => (
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
              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Subtotal</span><span className="font-mono">{formatCurrency(inv.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">VAT 15%</span><span className="font-mono">{formatCurrency(inv.vatAmount)}</span></div>
              <div className="flex justify-between border-t border-[var(--color-border-subtle)] pt-1 font-semibold"><span>Total</span><span className="font-mono">{formatCurrency(inv.total)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p) => (
              <div key={String(p._id)} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-xs">
                <div>
                  <div className="font-mono">{p.code}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">{formatDate(p.receivedAt)} · {p.method.replace("_", " ")}</div>
                </div>
                <div className="font-mono font-semibold text-[var(--color-success)]">{formatCurrency(p.amount)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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
