import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice, Notification } from "@/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();

  // Update aging buckets + status on all open invoices
  const open = await Invoice.find({
    status: { $in: ["issued", "sent", "viewed", "partially_paid"] },
    deletedAt: null,
  });

  let statusUpdates = 0;
  let notificationsSent = 0;

  for (const inv of open) {
    const daysSinceDue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000);

    let newBucket: "current" | "1-30" | "31-60" | "61-90" | "90+" = "current";
    let newStatus = inv.status;

    if (daysSinceDue > 90) {
      newBucket = "90+";
      newStatus = "overdue";
    } else if (daysSinceDue > 60) {
      newBucket = "61-90";
      newStatus = "overdue";
    } else if (daysSinceDue > 30) {
      newBucket = "31-60";
      newStatus = "overdue";
    } else if (daysSinceDue > 0) {
      newBucket = "1-30";
      newStatus = "overdue";
    }

    const changed = inv.agingBucket !== newBucket || inv.status !== newStatus;
    if (changed) {
      inv.agingBucket = newBucket;
      inv.agingDays = Math.max(0, daysSinceDue);
      if (inv.status !== "partially_paid" || newStatus === "overdue") inv.status = newStatus;
      await inv.save();
      statusUpdates++;
    }

    // Notifications at milestones: -7 (pre-due), 0 (due today), +7, +30, +60
    const milestones = [-7, 0, 7, 30, 60];
    if (milestones.includes(daysSinceDue) && inv.assignedCollectionOfficerId) {
      const note = daysSinceDue < 0
        ? "Invoice due in 7 days"
        : daysSinceDue === 0
          ? "Invoice due today"
          : `Invoice overdue by ${daysSinceDue} days`;

      // Prevent duplicate today
      const existsToday = inv.paymentReminders?.some((r) => {
        const rDate = new Date(r.sentAt);
        return rDate.getFullYear() === now.getFullYear() && rDate.getMonth() === now.getMonth() && rDate.getDate() === now.getDate();
      });

      if (!existsToday) {
        inv.paymentReminders.push({
          sentAt: now,
          type: daysSinceDue < 0 ? "pre_due" : daysSinceDue === 0 ? "due" : daysSinceDue > 30 ? "final" : "overdue",
          channel: "email",
          note,
        } as unknown as (typeof inv.paymentReminders)[number]);
        await inv.save();

        await Notification.create({
          userId: inv.assignedCollectionOfficerId,
          type: "invoice_overdue",
          title: note,
          body: `Invoice ${inv.code} · Balance ${inv.balance}`,
          link: `/finance/invoices/${inv._id}`,
          priority: daysSinceDue > 60 ? "critical" : daysSinceDue > 30 ? "high" : "normal",
          entityType: "invoice",
          entityId: inv._id,
        });
        notificationsSent++;
      }
    }
  }

  return NextResponse.json({ ok: true, statusUpdates, notificationsSent, totalChecked: open.length });
}
