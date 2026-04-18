import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Invoice } from "@/models";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function PortalInvoicesPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) return <EmptyState icon={<Receipt className="size-4" />} title="No customer linked" />;

  const invoices = await Invoice.find({ customerId: customer._id, deletedAt: null })
    .sort({ issueDate: -1 })
    .lean();

  const outstanding = invoices.reduce((a, i) => a + (i.balance ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-semibold">Invoices</h1>
          <p className="text-xs text-[var(--color-text-muted)]">ZATCA-compliant e-invoices</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Outstanding balance</div>
          <div className="font-mono text-[16px] font-semibold text-[var(--color-warning)]">
            {formatCurrency(outstanding)}
          </div>
        </div>
      </div>
      {invoices.length === 0 ? (
        <EmptyState icon={<Receipt className="size-4" />} title="No invoices" />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Card key={String(inv._id)}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">{inv.code}</span>
                    <InvoiceStatusBadge status={inv.status as InvoiceStatus} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                    Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-semibold">{formatCurrency(inv.total)}</div>
                  {inv.balance > 0 && (
                    <div className="font-mono text-[11px] text-[var(--color-warning)]">
                      Balance: {formatCurrency(inv.balance)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
