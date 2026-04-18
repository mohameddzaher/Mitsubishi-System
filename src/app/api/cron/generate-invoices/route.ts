import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Contract, Invoice } from "@/models";
import { VAT_RATE } from "@/config/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contracts = await Contract.find({
    status: { $in: ["active", "expiring_soon"] },
    deletedAt: null,
  }).lean();

  let created = 0;
  const results: Array<{ contract: string; code: string; status: string }> = [];

  for (const c of contracts) {
    const monthsInterval = c.billingCycle === "monthly" ? 1 : c.billingCycle === "quarterly" ? 3 : c.billingCycle === "semi_annual" ? 6 : 12;

    // Find last invoice for this contract
    const lastInvoice = await Invoice.findOne({ contractId: c._id }).sort({ periodEnd: -1 }).lean();

    const periodStart = lastInvoice?.periodEnd ?? c.startDate;
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + monthsInterval);

    // Only generate if period start is in past or present
    if (new Date(periodStart) > today) {
      results.push({ contract: String(c._id), code: c.code, status: "not_due_yet" });
      continue;
    }

    // Don't duplicate
    const existing = await Invoice.findOne({ contractId: c._id, periodStart: new Date(periodStart) });
    if (existing) {
      results.push({ contract: String(c._id), code: c.code, status: "exists" });
      continue;
    }

    const count = await Invoice.countDocuments({ branchId: c.branchId });
    const code = `INV-MKK-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const periodPrice = Math.round(c.price / (12 / monthsInterval));
    const vat = Math.round(periodPrice * VAT_RATE);
    const total = periodPrice + vat;
    const dueDate = new Date(periodStart);
    dueDate.setDate(dueDate.getDate() + 30);

    await Invoice.create({
      code,
      customerId: c.customerId,
      contractId: c._id,
      issueDate: new Date(),
      dueDate,
      periodStart: new Date(periodStart),
      periodEnd,
      items: [
        {
          description: `${c.type.replace(/_/g, " ")} — ${new Date(periodStart).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} to ${periodEnd.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
          qty: c.unitCount,
          unitPrice: Math.round(periodPrice / Math.max(c.unitCount as number, 1)),
          total: periodPrice,
          taxRate: VAT_RATE,
        },
      ],
      subtotal: periodPrice,
      vatAmount: vat,
      total,
      paidAmount: 0,
      balance: total,
      status: "issued",
      agingBucket: "current",
      agingDays: 0,
      branchId: c.branchId,
    });

    created++;
    results.push({ contract: String(c._id), code, status: "created" });
  }

  return NextResponse.json({ ok: true, created, total: results.length, results });
}
