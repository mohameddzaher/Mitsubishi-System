import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, WorkOrder } from "@/models";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkOrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function PortalVisitsPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) return <EmptyState icon={<CalendarCheck className="size-4" />} title="No customer linked" />;

  const visits = await WorkOrder.find({ customerId: customer._id, deletedAt: null })
    .sort({ scheduledDate: -1 })
    .limit(50)
    .populate("unitId", "code model")
    .populate("technicianId", "firstName lastName")
    .lean();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">Service history</h1>
        <p className="text-xs text-[var(--color-text-muted)]">All visits, past and upcoming</p>
      </div>
      {visits.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="size-4" />} title="No visits recorded" />
      ) : (
        <div className="space-y-2">
          {visits.map((v) => {
            const u = v.unitId as unknown as { code?: string; model?: string } | null;
            const t = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;
            const fb = v.customerFeedback;
            return (
              <Link key={String(v._id)} href={`/portal/visits/${String(v._id)}`}>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{v.code}</span>
                          <Badge variant="outline">{String(v.type).replace("_", " ")}</Badge>
                          <WorkOrderStatusBadge status={v.status as WorkOrderStatus} />
                        </div>
                        <div className="mt-1 text-xs font-medium">
                          {formatDate(v.scheduledDate)} at {v.scheduledTime} · {u?.model ?? "—"}
                        </div>
                        {t && (
                          <div className="text-[10px] text-[var(--color-text-muted)]">
                            Technician: {t.firstName} {t.lastName}
                          </div>
                        )}
                      </div>
                      {fb?.rating && (
                        <div className="text-[var(--color-accent-gold)]">
                          {"★".repeat(fb.rating)}
                          <span className="text-[var(--color-text-disabled)]">{"★".repeat(5 - fb.rating)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
