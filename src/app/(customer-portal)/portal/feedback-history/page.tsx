import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder, Customer } from "@/models";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FeedbackHistoryPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) return <EmptyState icon={<Star className="size-4" />} title="No customer linked" />;

  const ratedVisits = await WorkOrder.find({
    customerId: customer._id,
    "customerFeedback.rating": { $exists: true, $ne: null },
    deletedAt: null,
  })
    .sort({ "customerFeedback.submittedAt": -1 })
    .populate("technicianId", "firstName lastName")
    .lean();

  const avg = ratedVisits.length > 0
    ? ratedVisits.reduce((sum, v) => sum + (v.customerFeedback?.rating ?? 0), 0) / ratedVisits.length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">Your feedback history</h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          {ratedVisits.length} ratings · average {avg.toFixed(1)} ★
        </p>
      </div>

      {ratedVisits.length === 0 ? (
        <EmptyState icon={<Star className="size-4" />} title="No feedback yet" description="After a visit completes, we will ask for your feedback here." />
      ) : (
        <div className="space-y-2">
          {ratedVisits.map((v) => {
            const t = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;
            const fb = v.customerFeedback;
            return (
              <Link key={String(v._id)} href={`/portal/visits/${String(v._id)}`}>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[var(--color-accent-gold)]">
                          {"★".repeat(fb?.rating ?? 0)}<span className="text-[var(--color-text-disabled)]">{"★".repeat(5 - (fb?.rating ?? 0))}</span>
                        </div>
                        {fb?.comment && <div className="mt-1 text-[11px] text-[var(--color-text-secondary)]">&ldquo;{fb.comment}&rdquo;</div>}
                        <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                          Visit {formatDate(v.scheduledDate)} {t && `· ${t.firstName} ${t.lastName}`}
                        </div>
                      </div>
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
