import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contract, Customer, Notification } from "@/models";

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
  const horizons = [30, 60, 90];

  const contracts = await Contract.find({
    status: { $in: ["active", "expiring_soon"] },
    endDate: { $gte: now, $lte: new Date(now.getTime() + 95 * 86_400_000) },
    deletedAt: null,
  }).lean();

  let notificationsSent = 0;
  let statusFlipped = 0;

  for (const c of contracts) {
    const daysLeft = Math.floor((new Date(c.endDate).getTime() - now.getTime()) / 86_400_000);

    // Flip to expiring_soon if within notice window
    if (daysLeft <= 90 && c.status === "active") {
      await Contract.updateOne({ _id: c._id }, { $set: { status: "expiring_soon" } });
      statusFlipped++;
    }

    // Send notifications at 90/60/30 day milestones
    if (!horizons.includes(daysLeft)) continue;

    const customer = await Customer.findById(c.customerId).lean();
    if (!customer) continue;

    // Notify assigned sales rep + collection officer
    const recipients = [customer.assignedSalesRepId, customer.assignedAccountManagerId].filter(Boolean);

    for (const userId of recipients) {
      await Notification.create({
        userId,
        type: "contract_expiring",
        title: `Contract expiring in ${daysLeft} days`,
        body: `${c.code} · ${customer.commercialName}`,
        link: `/contracts/${c._id}`,
        priority: daysLeft <= 30 ? "high" : "normal",
        entityType: "contract",
        entityId: c._id,
      });
      notificationsSent++;
    }
  }

  return NextResponse.json({ ok: true, checked: contracts.length, statusFlipped, notificationsSent });
}
