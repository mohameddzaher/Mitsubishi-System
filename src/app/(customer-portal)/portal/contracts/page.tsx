import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Contract, Customer } from "@/models";
import { EmptyState } from "@/components/ui/empty-state";
import { FileSignature } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalContractsPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) return <EmptyState icon={<FileSignature className="size-4" />} title="No customer linked" />;

  const contracts = await Contract.find({ customerId: customer._id, deletedAt: null }).sort({ endDate: -1 }).lean();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">My contracts</h1>
        <p className="text-xs text-[var(--color-text-muted)]">{contracts.length} contracts on record</p>
      </div>
      {contracts.length === 0 ? (
        <EmptyState icon={<FileSignature className="size-4" />} title="No contracts" />
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <Link key={String(c._id)} href={`/portal/contracts/${String(c._id)}`}>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px]">{c.code}</span>
                        <Badge variant="outline">{String(c.type).replace(/_/g, " ")}</Badge>
                        <Badge variant={c.status === "active" ? "success" : c.status === "expiring_soon" ? "warning" : "outline"}>{String(c.status).replace(/_/g, " ")}</Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        {formatDate(c.startDate)} → {formatDate(c.endDate)} · {c.unitCount} units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold">{formatCurrency(c.total)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
