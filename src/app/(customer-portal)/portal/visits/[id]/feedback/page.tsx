import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder, Customer } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "./feedback-form";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VisitFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) notFound();

  let v;
  try {
    v = await WorkOrder.findById(id).populate("technicianId", "firstName lastName").lean();
  } catch {
    notFound();
  }
  if (!v || String(v.customerId) !== String(customer._id)) notFound();

  const tech = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href={`/portal/visits/${id}`} className="text-[var(--color-text-muted)]">← Back to visit</Link></div>

      <div>
        <h1 className="text-[18px] font-semibold">Rate your visit</h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Visit on {formatDate(v.scheduledDate)} {tech && `by ${tech.firstName} ${tech.lastName}`}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your rating</CardTitle></CardHeader>
        <CardContent>
          <FeedbackForm workOrderId={id} initialRating={v.customerFeedback?.rating ?? 0} initialComment={v.customerFeedback?.comment ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
