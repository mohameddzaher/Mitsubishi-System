import "server-only";
import { connectDB } from "@/lib/db";
import { Customer, Invoice, WorkOrder, Dispute } from "@/models";
import type { FilterQuery } from "mongoose";
import { UserRole } from "@/config/roles";

type Ctx = {
  userId: string;
  role: UserRole;
  branchId: string | null;
  departmentId: string | null;
};

function bf<T>(ctx: Ctx, base: FilterQuery<T> = {}): FilterQuery<T> {
  if (ctx.role === UserRole.SUPER_ADMIN || ctx.role === UserRole.CHAIRMAN || ctx.role === UserRole.CEO) return base;
  if (ctx.branchId) return { ...base, branchId: ctx.branchId } as FilterQuery<T>;
  return base;
}

export type HealthScore = {
  customerId: string;
  commercialName: string;
  code: string;
  score: number; // 0-100
  band: "green" | "yellow" | "red";
  factors: {
    paymentBehavior: number;
    serviceSatisfaction: number;
    complaintVolume: number;
    riskRating: number;
  };
  signals: string[];
};

export async function getCustomerHealthScores(ctx: Ctx, limit = 100): Promise<HealthScore[]> {
  await connectDB();

  const customers = await Customer.find(bf(ctx, { status: "active", deletedAt: null })).lean();

  const [allInvoices, allRatings, allDisputes] = await Promise.all([
    Invoice.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      {
        $group: {
          _id: "$customerId",
          total: { $sum: 1 },
          overdue: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          overdueAmount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$balance", 0] } },
          totalAmount: { $sum: "$total" },
        },
      },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { "customerFeedback.rating": { $exists: true } }) },
      { $group: { _id: "$customerId", avgRating: { $avg: "$customerFeedback.rating" }, count: { $sum: 1 } } },
    ]),
    Dispute.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      {
        $group: {
          _id: "$customerId",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ["$status", ["open", "investigating", "escalated"]] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const invMap = new Map(allInvoices.map((i) => [String(i._id), i]));
  const ratingMap = new Map(allRatings.map((r) => [String(r._id), r]));
  const disputeMap = new Map(allDisputes.map((d) => [String(d._id), d]));

  const scores: HealthScore[] = customers.map((c) => {
    const invStats = invMap.get(String(c._id));
    const ratingStats = ratingMap.get(String(c._id));
    const disputeStats = disputeMap.get(String(c._id));

    // Payment behavior (0-40): fewer overdue invoices = higher score
    const overdueRatio = invStats && invStats.total > 0 ? (invStats.overdue as number) / (invStats.total as number) : 0;
    const paymentBehavior = Math.round((1 - overdueRatio) * 40);

    // Service satisfaction (0-30): avg rating ÷ 5 × 30
    const ratingAvg = (ratingStats?.avgRating as number) ?? 3.5;
    const serviceSatisfaction = Math.round((ratingAvg / 5) * 30);

    // Complaint volume (0-20): fewer open disputes = higher
    const openDisputes = (disputeStats?.open as number) ?? 0;
    const complaintVolume = Math.max(0, 20 - openDisputes * 5);

    // Risk rating (0-10): A=10, B=7, C=4, D=1
    const riskMap: Record<string, number> = { A: 10, B: 7, C: 4, D: 1 };
    const riskRating = riskMap[c.riskRating ?? "B"] ?? 7;

    const score = paymentBehavior + serviceSatisfaction + complaintVolume + riskRating;

    const band: "green" | "yellow" | "red" = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";

    const signals: string[] = [];
    if ((invStats?.overdue ?? 0) > 0) signals.push(`${invStats!.overdue} overdue invoice${(invStats!.overdue as number) > 1 ? "s" : ""}`);
    if (ratingAvg < 3.5 && ratingStats) signals.push(`Low satisfaction (${ratingAvg.toFixed(1)}★)`);
    if (openDisputes > 0) signals.push(`${openDisputes} open dispute${openDisputes > 1 ? "s" : ""}`);
    if (c.riskRating === "D") signals.push("High risk rating");
    if (signals.length === 0) signals.push("All indicators healthy");

    return {
      customerId: String(c._id),
      commercialName: c.commercialName,
      code: c.code,
      score,
      band,
      factors: { paymentBehavior, serviceSatisfaction, complaintVolume, riskRating },
      signals,
    };
  });

  return scores.sort((a, b) => a.score - b.score).slice(0, limit);
}

export async function getHealthBandCounts(ctx: Ctx) {
  const scores = await getCustomerHealthScores(ctx, 10_000);
  return {
    green: scores.filter((s) => s.band === "green").length,
    yellow: scores.filter((s) => s.band === "yellow").length,
    red: scores.filter((s) => s.band === "red").length,
    total: scores.length,
  };
}
