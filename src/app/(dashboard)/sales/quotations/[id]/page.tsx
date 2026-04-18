import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Quotation } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { QuotationActions } from "./quotation-actions";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let q;
  try {
    q = await Quotation.findById(id)
      .populate("customerId", "commercialName code")
      .populate("preparedBy", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!q) notFound();

  const c = q.customerId as unknown as { _id?: unknown; commercialName?: string; code?: string } | null;
  const prep = q.preparedBy as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/sales/quotations" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All quotations
        </Link>
      </div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FileText className="size-4 text-[var(--color-brand)]" />
            <span className="font-mono">{q.code}</span>
            <Badge variant="outline">v{q.version}</Badge>
            <Badge variant={q.status === "accepted" ? "success" : q.status === "rejected" ? "danger" : q.status === "sent" || q.status === "viewed" ? "info" : "outline"}>{q.status}</Badge>
          </span>
        }
        description={c ? (
          <Link href={`/customers/${String(c._id)}`} className="hover:text-[var(--color-text-primary)]">
            {c.commercialName} · {c.code}
          </Link>
        ) : undefined}
        actions={<QuotationActions quotationId={id} status={q.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-[var(--color-text-muted)]">
                      No line items yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  q.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.qty}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Status">{q.status}</Row>
            <Row label="Contract type">{q.contractType}</Row>
            <Row label="Subtotal">{formatCurrency(q.subtotal)}</Row>
            <Row label="VAT">{formatCurrency(q.vatAmount)}</Row>
            <Row label="Total" bold>{formatCurrency(q.total)}</Row>
            <Row label="Valid until">{q.validUntil ? formatDate(q.validUntil) : "—"}</Row>
            <Row label="Prepared by">{prep ? `${prep.firstName} ${prep.lastName}` : "—"}</Row>
            <Row label="Sent at">{q.sentAt ? formatDate(q.sentAt) : "—"}</Row>
            <Row label="Accepted at">{q.acceptedAt ? formatDate(q.acceptedAt) : "—"}</Row>
          </CardContent>
        </Card>
      </div>

      {q.terms && (
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{q.terms}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, children, bold }: { label: string; children: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0 ${bold ? "font-semibold text-sm" : ""}`}>
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className={bold ? "font-mono" : ""}>{children}</span>
    </div>
  );
}
