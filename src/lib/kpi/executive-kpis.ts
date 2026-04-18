import "server-only";
import { connectDB } from "@/lib/db";
import {
  Customer,
  Contract,
  Unit,
  Invoice,
  WorkOrder,
  Payment,
  Dispute,
  SparePart,
  User,
  Opportunity,
} from "@/models";
import type { FilterQuery } from "mongoose";
import { UserRole } from "@/config/roles";

type Ctx = {
  userId: string;
  role: UserRole;
  branchId: string | null;
  departmentId: string | null;
};

function branchFilter<T>(ctx: Ctx, base: FilterQuery<T> = {}): FilterQuery<T> {
  if (ctx.role === UserRole.SUPER_ADMIN || ctx.role === UserRole.CHAIRMAN || ctx.role === UserRole.CEO) {
    return base;
  }
  if (ctx.branchId) return { ...base, branchId: ctx.branchId } as FilterQuery<T>;
  return base;
}

export async function getRevenueTrend(ctx: Ctx, monthsBack = 12) {
  await connectDB();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

  const data = await Payment.aggregate([
    {
      $match: {
        ...branchFilter(ctx),
        receivedAt: { $gte: start },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: { y: { $year: "$receivedAt" }, m: { $month: "$receivedAt" } },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]);

  // Fill missing months with 0
  const result: Array<{ label: string; value: number }> = [];
  for (let i = 0; i <= monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsBack + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const match = data.find((r) => r._id.y === y && r._id.m === m);
    result.push({
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      value: match?.total ?? 0,
    });
  }
  return result;
}

export async function getCustomerStatusBreakdown(ctx: Ctx) {
  await connectDB();
  const data = await Customer.aggregate([
    { $match: branchFilter(ctx, { deletedAt: null }) },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return data.map((r) => ({ status: r._id as string, count: r.count as number }));
}

export async function getPipelineFunnel(ctx: Ctx) {
  await connectDB();
  const data = await Opportunity.aggregate([
    { $match: branchFilter(ctx, { deletedAt: null }) },
    { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" } } },
  ]);
  return data.map((r) => ({ stage: r._id as string, count: r.count as number, value: r.value as number }));
}

export async function getVisitTypeBreakdown(ctx: Ctx) {
  await connectDB();
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const data = await WorkOrder.aggregate([
    { $match: branchFilter(ctx, { scheduledDate: { $gte: last30 }, deletedAt: null }) },
    { $group: { _id: "$type", count: { $sum: 1 } } },
  ]);
  return data.map((r) => ({ type: r._id as string, count: r.count as number }));
}

export async function getTechnicianLeaderboard(ctx: Ctx, limit = 10) {
  await connectDB();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const data = await WorkOrder.aggregate([
    {
      $match: branchFilter(ctx, {
        status: "completed",
        scheduledDate: { $gte: thirtyDaysAgo },
        deletedAt: null,
      }),
    },
    {
      $group: {
        _id: "$technicianId",
        visitsCompleted: { $sum: 1 },
        avgRating: { $avg: "$customerFeedback.rating" },
        avgDurationVariance: { $avg: "$durationVarianceMinutes" },
        totalDuration: { $sum: "$actualDurationMinutes" },
      },
    },
    { $sort: { visitsCompleted: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "tech",
      },
    },
    { $unwind: "$tech" },
    {
      $project: {
        _id: 1,
        firstName: "$tech.firstName",
        lastName: "$tech.lastName",
        employeeId: "$tech.employeeId",
        visitsCompleted: 1,
        avgRating: { $round: ["$avgRating", 2] },
        avgDurationVariance: { $round: ["$avgDurationVariance", 0] },
      },
    },
  ]);
  return data;
}

export async function getTopOverdueCustomers(ctx: Ctx, limit = 10) {
  await connectDB();
  const data = await Invoice.aggregate([
    { $match: branchFilter(ctx, { status: "overdue", deletedAt: null }) },
    {
      $group: {
        _id: "$customerId",
        totalOverdue: { $sum: "$balance" },
        invoiceCount: { $sum: 1 },
        maxDays: { $max: "$agingDays" },
      },
    },
    { $sort: { totalOverdue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "customers",
        localField: "_id",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    {
      $project: {
        _id: 1,
        commercialName: "$customer.commercialName",
        code: "$customer.code",
        totalOverdue: 1,
        invoiceCount: 1,
        maxDays: 1,
      },
    },
  ]);
  return data;
}

export async function getCollectionRate(ctx: Ctx) {
  await connectDB();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [issued, collected] = await Promise.all([
    Invoice.aggregate([
      { $match: branchFilter(ctx, { issueDate: { $gte: thirtyDaysAgo }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Payment.aggregate([
      { $match: branchFilter(ctx, { receivedAt: { $gte: thirtyDaysAgo }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const issuedTotal = issued[0]?.total ?? 0;
  const collectedTotal = collected[0]?.total ?? 0;
  const rate = issuedTotal > 0 ? (collectedTotal / issuedTotal) * 100 : 0;
  return { issuedTotal, collectedTotal, rate };
}

export async function getUnitAgeDistribution(ctx: Ctx) {
  await connectDB();
  const now = new Date();
  const buckets = [
    { label: "< 5y", min: 0, max: 5 },
    { label: "5–10y", min: 5, max: 10 },
    { label: "10–15y", min: 10, max: 15 },
    { label: "15y+", min: 15, max: 999 },
  ];

  const units = await Unit.find(branchFilter(ctx, { deletedAt: null, installedAt: { $exists: true } })).select("installedAt").lean();
  const result = buckets.map((b) => ({ label: b.label, count: 0 }));
  for (const u of units) {
    if (!u.installedAt) continue;
    const years = (now.getTime() - new Date(u.installedAt).getTime()) / (365.25 * 86_400_000);
    const slot = buckets.findIndex((b) => years >= b.min && years < b.max);
    if (slot >= 0) result[slot]!.count++;
  }
  return result;
}

export async function getExecutiveSummary(ctx: Ctx) {
  await connectDB();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(monthStart);

  const [
    mtdRevenue,
    ytdRevenue,
    prevMonthRevenue,
    activeCustomers,
    totalCustomers,
    activeContracts,
    contractValue,
    totalUnits,
    operationalUnits,
    openAR,
    overdueAR,
    openDisputes,
    criticalDisputes,
    technicianCount,
    salesTeamCount,
    feedbackAvg,
    lowStockCount,
    expiring90,
    expiring60,
    expiring30,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: branchFilter(ctx, { receivedAt: { $gte: monthStart }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: branchFilter(ctx, { receivedAt: { $gte: yearStart }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: branchFilter(ctx, { receivedAt: { $gte: prevMonthStart, $lt: prevMonthEnd }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Customer.countDocuments(branchFilter(ctx, { status: "active", deletedAt: null })),
    Customer.countDocuments(branchFilter(ctx, { deletedAt: null })),
    Contract.countDocuments(branchFilter(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null })),
    Contract.aggregate([
      { $match: branchFilter(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Unit.countDocuments(branchFilter(ctx, { deletedAt: null })),
    Unit.countDocuments(branchFilter(ctx, { currentStatus: "operational", deletedAt: null })),
    Invoice.aggregate([
      { $match: branchFilter(ctx, { status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
    Invoice.aggregate([
      { $match: branchFilter(ctx, { status: "overdue", deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]),
    Dispute.countDocuments(branchFilter(ctx, { status: { $in: ["open", "investigating", "escalated"] }, deletedAt: null })),
    Dispute.countDocuments(branchFilter(ctx, { severity: "critical", status: { $in: ["open", "investigating", "escalated"] }, deletedAt: null })),
    User.countDocuments({
      ...branchFilter(ctx),
      role: { $in: [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN] },
      status: "active",
      deletedAt: null,
    }),
    User.countDocuments({
      ...branchFilter(ctx),
      role: { $in: [UserRole.SALES_EXECUTIVE, UserRole.SALES_ENGINEER, UserRole.SALES_MANAGER] },
      status: "active",
      deletedAt: null,
    }),
    WorkOrder.aggregate([
      { $match: branchFilter(ctx, { "customerFeedback.rating": { $exists: true } }) },
      { $group: { _id: null, avg: { $avg: "$customerFeedback.rating" }, count: { $sum: 1 } } },
    ]),
    SparePart.countDocuments({
      ...branchFilter(ctx, { deletedAt: null }),
      $expr: { $lt: ["$stockLevel", "$reorderLevel"] },
    }),
    Contract.countDocuments(
      branchFilter(ctx, {
        endDate: { $gte: new Date(), $lte: new Date(Date.now() + 90 * 86_400_000) },
        status: { $in: ["active", "expiring_soon"] },
        deletedAt: null,
      }),
    ),
    Contract.countDocuments(
      branchFilter(ctx, {
        endDate: { $gte: new Date(), $lte: new Date(Date.now() + 60 * 86_400_000) },
        status: { $in: ["active", "expiring_soon"] },
        deletedAt: null,
      }),
    ),
    Contract.countDocuments(
      branchFilter(ctx, {
        endDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86_400_000) },
        status: { $in: ["active", "expiring_soon"] },
        deletedAt: null,
      }),
    ),
  ]);

  const mtd = mtdRevenue[0]?.total ?? 0;
  const ytd = ytdRevenue[0]?.total ?? 0;
  const prevMonth = prevMonthRevenue[0]?.total ?? 0;
  const momDelta = prevMonth > 0 ? ((mtd - prevMonth) / prevMonth) * 100 : 0;

  return {
    mtdRevenue: mtd,
    ytdRevenue: ytd,
    momDelta,
    activeCustomers,
    totalCustomers,
    activeContracts,
    contractValue: contractValue[0]?.total ?? 0,
    totalUnits,
    operationalUnits,
    openAR: openAR[0]?.total ?? 0,
    overdueAR: overdueAR[0]?.total ?? 0,
    openDisputes,
    criticalDisputes,
    technicianCount,
    salesTeamCount,
    feedbackAvg: feedbackAvg[0]?.avg ?? 0,
    feedbackCount: feedbackAvg[0]?.count ?? 0,
    lowStockCount,
    expiring90,
    expiring60,
    expiring30,
  };
}
