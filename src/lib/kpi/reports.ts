import "server-only";
import { connectDB } from "@/lib/db";
import {
  Customer,
  Contract,
  Unit,
  Invoice,
  WorkOrder,
  Payment,
  Opportunity,
  SparePartRequest,
  Dispute,
  User,
  PromiseToPay,
} from "@/models";
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

// ============ SALES ============
export async function getSalesReport(ctx: Ctx) {
  await connectDB();
  const thirtyAgo = new Date(Date.now() - 30 * 86_400_000);
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000);
  const yearAgo = new Date(Date.now() - 365 * 86_400_000);

  const [
    pipelineFunnel,
    winLoss,
    topReps,
    avgDealSize,
    cycleAvg,
    quotaAttainment,
    lostReasons,
    monthlyTrend,
    dealTypeBreakdown,
    repDetailedLeaderboard,
    recentWinsSample,
    leadSources,
    quotationStatusBreakdown,
  ] = await Promise.all([
    Opportunity.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" }, weighted: { $sum: { $multiply: ["$value", { $divide: ["$probability", 100] }] } } } },
    ]),
    Opportunity.aggregate([
      { $match: bf(ctx, { createdAt: { $gte: ninetyAgo }, deletedAt: null }) },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: bf(ctx, { stage: "won", actualCloseDate: { $gte: ninetyAgo }, deletedAt: null }) },
      { $group: { _id: "$ownerId", wins: { $sum: 1 }, totalValue: { $sum: "$value" } } },
      { $sort: { totalValue: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "owner" } },
      { $unwind: "$owner" },
      { $project: { wins: 1, totalValue: 1, firstName: "$owner.firstName", lastName: "$owner.lastName" } },
    ]),
    Opportunity.aggregate([
      { $match: bf(ctx, { stage: "won", deletedAt: null }) },
      { $group: { _id: null, avg: { $avg: "$value" }, max: { $max: "$value" }, min: { $min: "$value" }, count: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: bf(ctx, { stage: "won", actualCloseDate: { $exists: true }, createdAt: { $exists: true }, deletedAt: null }) },
      { $project: { days: { $divide: [{ $subtract: ["$actualCloseDate", "$createdAt"] }, 86_400_000] } } },
      { $group: { _id: null, avg: { $avg: "$days" } } },
    ]),
    Customer.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$assignedSalesRepId", total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
      { $sort: { active: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "rep" } },
      { $unwind: "$rep" },
      { $project: { total: 1, active: 1, firstName: "$rep.firstName", lastName: "$rep.lastName" } },
    ]),
    Opportunity.aggregate([
      { $match: bf(ctx, { stage: "lost", lossReason: { $ne: "" }, deletedAt: null }) },
      { $group: { _id: "$lossReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    // Monthly won/lost trend for last 12 months
    Opportunity.aggregate([
      { $match: bf(ctx, { actualCloseDate: { $gte: yearAgo }, stage: { $in: ["won", "lost"] } }) },
      {
        $group: {
          _id: { y: { $year: "$actualCloseDate" }, m: { $month: "$actualCloseDate" }, stage: "$stage" },
          count: { $sum: 1 },
          value: { $sum: "$value" },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    // Opportunity deal types
    Opportunity.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$dealType", count: { $sum: 1 }, value: { $sum: "$value" } } },
    ]),
    // Detailed rep leaderboard — all reps with multi-metric view
    Customer.aggregate([
      { $match: bf(ctx, { assignedSalesRepId: { $ne: null }, deletedAt: null }) },
      {
        $group: {
          _id: "$assignedSalesRepId",
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          leads: { $sum: { $cond: [{ $eq: ["$status", "lead"] }, 1, 0] } },
          qualified: { $sum: { $cond: [{ $eq: ["$status", "qualified"] }, 1, 0] } },
          quoted: { $sum: { $cond: [{ $eq: ["$status", "quotation_sent"] }, 1, 0] } },
          churned: { $sum: { $cond: [{ $eq: ["$status", "churned"] }, 1, 0] } },
        },
      },
      { $sort: { active: -1 } },
      { $limit: 15 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "rep" } },
      { $unwind: "$rep" },
      { $project: { total: 1, active: 1, leads: 1, qualified: 1, quoted: 1, churned: 1, firstName: "$rep.firstName", lastName: "$rep.lastName" } },
    ]),
    Opportunity.find(bf(ctx, { stage: "won", deletedAt: null }))
      .sort({ actualCloseDate: -1 })
      .limit(10)
      .populate("customerId", "commercialName")
      .populate("ownerId", "firstName lastName")
      .lean(),
    // Lead sources
    Customer.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$leadSource", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    // Quotation status
    (await import("@/models")).Quotation.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$total" } } },
    ]),
  ]);

  const won = winLoss.find((x) => x._id === "won")?.count ?? 0;
  const lost = winLoss.find((x) => x._id === "lost")?.count ?? 0;
  const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  return {
    pipelineFunnel,
    winRate,
    won,
    lost,
    topReps,
    avgDealSize: avgDealSize[0]?.avg ?? 0,
    largestDeal: avgDealSize[0]?.max ?? 0,
    smallestDeal: avgDealSize[0]?.min ?? 0,
    totalWonDeals: avgDealSize[0]?.count ?? 0,
    cycleDaysAvg: cycleAvg[0]?.avg ?? 0,
    quotaAttainment,
    lostReasons,
    totalPipelineValue: pipelineFunnel.reduce((a, p) => a + (p.value ?? 0), 0),
    weightedPipeline: pipelineFunnel.reduce((a, p) => a + (p.weighted ?? 0), 0),
    monthlyTrend,
    dealTypeBreakdown,
    repDetailedLeaderboard,
    recentWinsSample,
    leadSources,
    quotationStatusBreakdown,
  };
}

// ============ SERVICE ============
export async function getServiceReport(ctx: Ctx) {
  await connectDB();
  const thirtyAgo = new Date(Date.now() - 30 * 86_400_000);
  const sevenAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    visitStatus,
    visitTypes,
    durationStats,
    ratingStats,
    topTechs,
    sparesConsumed,
    emergencyStats,
    reVisits,
    dailyTrend,
    dayOfWeekDistribution,
    bottomTechs,
    visitsByPriority,
    recentFeedback,
  ] = await Promise.all([
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { status: "completed", actualDurationMinutes: { $gt: 0 }, deletedAt: null }) },
      { $group: { _id: null, avgActual: { $avg: "$actualDurationMinutes" }, avgExpected: { $avg: "$expectedDurationMinutes" }, avgVariance: { $avg: "$durationVarianceMinutes" } } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { "customerFeedback.rating": { $exists: true } }) },
      { $group: { _id: "$customerFeedback.rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { status: "completed", scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      {
        $group: {
          _id: "$technicianId",
          visits: { $sum: 1 },
          avgRating: { $avg: "$customerFeedback.rating" },
          onTimeCount: { $sum: { $cond: [{ $lte: ["$durationVarianceMinutes", 10] }, 1, 0] } },
        },
      },
      { $sort: { visits: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "tech" } },
      { $unwind: "$tech" },
      {
        $project: {
          visits: 1,
          avgRating: { $round: ["$avgRating", 2] },
          onTimeRate: { $multiply: [{ $divide: ["$onTimeCount", "$visits"] }, 100] },
          firstName: "$tech.firstName",
          lastName: "$tech.lastName",
        },
      },
    ]),
    SparePartRequest.aggregate([
      { $match: bf(ctx, { createdAt: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$qty" }, requests: { $sum: 1 } } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { type: "emergency", deletedAt: null }) },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          avgDuration: { $avg: "$actualDurationMinutes" },
        },
      },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: "$unitId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "repeatedUnits" },
    ]),
    // Daily trend - last 30 days
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      {
        $group: {
          _id: { y: { $year: "$scheduledDate" }, m: { $month: "$scheduledDate" }, d: { $dayOfMonth: "$scheduledDate" } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]),
    // Day-of-week distribution
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: { $dayOfWeek: "$scheduledDate" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Bottom techs (needing improvement)
    WorkOrder.aggregate([
      { $match: bf(ctx, { status: "completed", scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      {
        $group: {
          _id: "$technicianId",
          visits: { $sum: 1 },
          avgRating: { $avg: "$customerFeedback.rating" },
          avgVariance: { $avg: "$durationVarianceMinutes" },
          onTimeCount: { $sum: { $cond: [{ $lte: ["$durationVarianceMinutes", 10] }, 1, 0] } },
        },
      },
      { $match: { visits: { $gte: 3 } } },
      { $sort: { avgRating: 1, avgVariance: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "tech" } },
      { $unwind: "$tech" },
      {
        $project: {
          visits: 1,
          avgRating: { $round: ["$avgRating", 2] },
          avgVariance: { $round: ["$avgVariance", 0] },
          onTimeRate: { $multiply: [{ $divide: ["$onTimeCount", "$visits"] }, 100] },
          firstName: "$tech.firstName",
          lastName: "$tech.lastName",
        },
      },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { scheduledDate: { $gte: thirtyAgo }, deletedAt: null }) },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    WorkOrder.find(bf(ctx, { "customerFeedback.submittedAt": { $gte: sevenAgo }, deletedAt: null }))
      .sort({ "customerFeedback.submittedAt": -1 })
      .limit(10)
      .populate("customerId", "commercialName")
      .populate("technicianId", "firstName lastName")
      .lean(),
  ]);

  const totalVisits = visitStatus.reduce((a, v) => a + v.count, 0);
  const completedVisits = visitStatus.find((v) => v._id === "completed")?.count ?? 0;
  const completionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;

  const totalRatings = ratingStats.reduce((a, r) => a + r.count, 0);
  const avgRating = totalRatings > 0 ? ratingStats.reduce((a, r) => a + r._id * r.count, 0) / totalRatings : 0;

  return {
    visitStatus,
    visitTypes,
    totalVisits,
    completedVisits,
    completionRate,
    avgActualDuration: durationStats[0]?.avgActual ?? 0,
    avgExpectedDuration: durationStats[0]?.avgExpected ?? 0,
    avgDurationVariance: durationStats[0]?.avgVariance ?? 0,
    avgRating,
    totalRatings,
    ratingBreakdown: ratingStats,
    topTechs,
    bottomTechs,
    sparePartsUsed: sparesConsumed[0] ?? { total: 0, requests: 0 },
    emergencyCount: emergencyStats[0]?.count ?? 0,
    emergencyAvgDuration: emergencyStats[0]?.avgDuration ?? 0,
    reVisitUnits: reVisits[0]?.repeatedUnits ?? 0,
    dailyTrend,
    dayOfWeekDistribution,
    visitsByPriority,
    recentFeedback,
  };
}

// ============ FINANCE ============
export async function getFinanceReport(ctx: Ctx) {
  await connectDB();
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const lastYearStart = new Date(new Date().getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(new Date().getFullYear(), 0, 1);

  const [
    revenueByType,
    revenueByMonth,
    vatCollected,
    marginByType,
    paymentMethods,
    lastYearRevenue,
    topCustomersByRevenue,
    invoiceStatusBreakdown,
    contractValueByBilling,
  ] = await Promise.all([
    Contract.aggregate([
      { $match: bf(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null }) },
      { $group: { _id: "$type", total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: bf(ctx, { receivedAt: { $gte: yearStart }, deletedAt: null }) },
      { $group: { _id: { m: { $month: "$receivedAt" } }, total: { $sum: "$amount" } } },
      { $sort: { "_id.m": 1 } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { status: "paid", paidAt: { $gte: yearStart }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$vatAmount" } } },
    ]),
    Contract.aggregate([
      { $match: bf(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null }) },
      { $group: { _id: "$type", avgTotal: { $avg: "$total" } } },
    ]),
    Payment.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$method", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: bf(ctx, { receivedAt: { $gte: lastYearStart, $lt: lastYearEnd }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { status: "paid", deletedAt: null }) },
      { $group: { _id: "$customerId", revenue: { $sum: "$total" }, invoices: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $project: { revenue: 1, invoices: 1, commercialName: "$c.commercialName", code: "$c.code" } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$total" } } },
    ]),
    Contract.aggregate([
      { $match: bf(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null }) },
      { $group: { _id: "$billingCycle", count: { $sum: 1 }, total: { $sum: "$total" } } },
    ]),
  ]);

  const ytdRevenue = revenueByMonth.reduce((a, m) => a + m.total, 0);
  const lastYearTotal = lastYearRevenue[0]?.total ?? 0;
  const yoyGrowth = lastYearTotal > 0 ? ((ytdRevenue - lastYearTotal) / lastYearTotal) * 100 : 0;

  return {
    revenueByType,
    revenueByMonth,
    ytdRevenue,
    vatCollectedYtd: vatCollected[0]?.total ?? 0,
    marginByType,
    paymentMethods,
    lastYearTotal,
    yoyGrowth,
    topCustomersByRevenue,
    invoiceStatusBreakdown,
    contractValueByBilling,
  };
}

// ============ COLLECTION ============
export async function getCollectionReport(ctx: Ctx) {
  await connectDB();
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000);
  const thirtyAgo = new Date(Date.now() - 30 * 86_400_000);

  const [aging, dsoData, collectionRate, officerPerf, ptpStats, writeOffs, collectionTrend, ptpData, topOverdueCustomers] = await Promise.all([
    Invoice.aggregate([
      { $match: bf(ctx, { status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] }, deletedAt: null }) },
      { $group: { _id: "$agingBucket", count: { $sum: 1 }, total: { $sum: "$balance" } } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      {
        $group: {
          _id: null,
          totalAR: { $sum: { $cond: [{ $in: ["$status", ["issued", "sent", "viewed", "partially_paid", "overdue"]] }, "$balance", 0] } },
          totalBilled: { $sum: "$total" },
        },
      },
    ]),
    Payment.aggregate([
      { $match: bf(ctx, { receivedAt: { $gte: ninetyAgo }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { deletedAt: null, assignedCollectionOfficerId: { $ne: null } }) },
      {
        $group: {
          _id: "$assignedCollectionOfficerId",
          portfolioCount: { $sum: 1 },
          portfolioValue: { $sum: "$total" },
          collectedValue: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
        },
      },
      { $sort: { collectedValue: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "officer" } },
      { $unwind: "$officer" },
      {
        $project: {
          portfolioCount: 1,
          portfolioValue: 1,
          collectedValue: 1,
          overdueCount: 1,
          collectionRate: { $multiply: [{ $divide: ["$collectedValue", { $max: ["$portfolioValue", 1] }] }, 100] },
          firstName: "$officer.firstName",
          lastName: "$officer.lastName",
        },
      },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { status: "paid", deletedAt: null }) },
      { $group: { _id: null, kept: { $sum: 1 } } },
    ]),
    Invoice.countDocuments(bf(ctx, { status: "written_off", deletedAt: null })),
    // Monthly collection trend
    Payment.aggregate([
      { $match: bf(ctx, { receivedAt: { $gte: ninetyAgo }, deletedAt: null }) },
      {
        $group: {
          _id: { y: { $year: "$receivedAt" }, m: { $month: "$receivedAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    // Promise-to-pay performance
    PromiseToPay.aggregate([
      { $match: bf(ctx, {}) },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
    Invoice.aggregate([
      { $match: bf(ctx, { status: "overdue", deletedAt: null }) },
      { $group: { _id: "$customerId", totalOverdue: { $sum: "$balance" }, count: { $sum: 1 }, maxDays: { $max: "$agingDays" } } },
      { $sort: { totalOverdue: -1 } },
      { $limit: 10 },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $project: { totalOverdue: 1, count: 1, maxDays: 1, commercialName: "$c.commercialName", code: "$c.code" } },
    ]),
  ]);

  const ptpKept = ptpData.find((p) => p._id === "kept")?.count ?? 0;
  const ptpBroken = ptpData.find((p) => p._id === "broken")?.count ?? 0;
  const ptpActive = ptpData.find((p) => p._id === "active")?.count ?? 0;
  const ptpHitRate = ptpKept + ptpBroken > 0 ? (ptpKept / (ptpKept + ptpBroken)) * 100 : 0;

  return {
    aging,
    totalAR: dsoData[0]?.totalAR ?? 0,
    totalBilled: dsoData[0]?.totalBilled ?? 0,
    dso:
      (dsoData[0]?.totalAR ?? 0) > 0 && (dsoData[0]?.totalBilled ?? 0) > 0
        ? ((dsoData[0]!.totalAR as number) / (dsoData[0]!.totalBilled as number)) * 365
        : 0,
    collectionRate90d: collectionRate[0] ?? { total: 0, count: 0 },
    officerPerf,
    paidInvoices: ptpStats[0]?.kept ?? 0,
    writeOffs,
    collectionTrend,
    ptpKept,
    ptpBroken,
    ptpActive,
    ptpHitRate,
    topOverdueCustomers,
  };
}

// ============ CUSTOMER ============
export async function getCustomerHealthReport(ctx: Ctx) {
  await connectDB();
  const ninetyAgo = new Date(Date.now() - 90 * 86_400_000);

  const [
    statusBreakdown,
    typeBreakdown,
    feedbackAvg,
    complaintsCount,
    riskBreakdown,
    topChurnRisk,
    customerAcquisitionMonthly,
    customerAgeBuckets,
    topCustomersByLifetime,
  ] = await Promise.all([
    Customer.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Customer.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    WorkOrder.aggregate([
      { $match: bf(ctx, { "customerFeedback.rating": { $exists: true } }) },
      { $group: { _id: null, avg: { $avg: "$customerFeedback.rating" }, count: { $sum: 1 } } },
    ]),
    Dispute.countDocuments(bf(ctx, { status: { $in: ["open", "investigating", "escalated"] }, deletedAt: null })),
    Customer.aggregate([
      { $match: bf(ctx, { deletedAt: null }) },
      { $group: { _id: "$riskRating", count: { $sum: 1 } } },
    ]),
    Customer.aggregate([
      { $match: bf(ctx, { riskRating: { $in: ["C", "D"] }, status: "active", deletedAt: null }) },
      { $limit: 10 },
      { $project: { _id: 1, commercialName: 1, code: 1, riskRating: 1, totalOutstanding: 1 } },
    ]),
    // Acquisition per month
    Customer.aggregate([
      { $match: bf(ctx, { createdAt: { $gte: ninetyAgo }, deletedAt: null }) },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          count: { $sum: 1 },
          activated: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } },
    ]),
    // Customer age (since activation)
    Customer.aggregate([
      { $match: bf(ctx, { status: "active", activatedAt: { $exists: true, $ne: null }, deletedAt: null }) },
      { $project: { ageDays: { $divide: [{ $subtract: [new Date(), "$activatedAt"] }, 86_400_000] } } },
      {
        $bucket: {
          groupBy: "$ageDays",
          boundaries: [0, 90, 180, 365, 730, 9999],
          default: "9999",
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    // Top customers by lifetime value (from paid invoices)
    Invoice.aggregate([
      { $match: bf(ctx, { status: "paid", deletedAt: null }) },
      { $group: { _id: "$customerId", ltv: { $sum: "$total" }, invoices: { $sum: 1 } } },
      { $sort: { ltv: -1 } },
      { $limit: 10 },
      { $lookup: { from: "customers", localField: "_id", foreignField: "_id", as: "c" } },
      { $unwind: "$c" },
      { $project: { ltv: 1, invoices: 1, commercialName: "$c.commercialName", code: "$c.code", type: "$c.type" } },
    ]),
  ]);

  const totalCustomers = statusBreakdown.reduce((a, s) => a + s.count, 0);
  const active = statusBreakdown.find((s) => s._id === "active")?.count ?? 0;
  const churned = statusBreakdown.find((s) => s._id === "churned")?.count ?? 0;

  return {
    statusBreakdown,
    typeBreakdown,
    totalCustomers,
    activeCustomers: active,
    churnedCustomers: churned,
    churnRate: totalCustomers > 0 ? (churned / totalCustomers) * 100 : 0,
    avgRating: feedbackAvg[0]?.avg ?? 0,
    totalRatings: feedbackAvg[0]?.count ?? 0,
    openDisputes: complaintsCount,
    riskBreakdown,
    topChurnRisk,
    customerAcquisitionMonthly,
    customerAgeBuckets,
    topCustomersByLifetime,
  };
}

// ============ EXECUTIVE ============
export async function getExecutiveReport(ctx: Ctx) {
  await connectDB();
  const [sales, service, finance, collection, customer] = await Promise.all([
    getSalesReport(ctx),
    getServiceReport(ctx),
    getFinanceReport(ctx),
    getCollectionReport(ctx),
    getCustomerHealthReport(ctx),
  ]);

  const [totalUsers, totalUnits, totalContractValue, activeEmergencies, pendingApprovals] = await Promise.all([
    User.countDocuments({ ...bf(ctx), status: "active", deletedAt: null }),
    Unit.countDocuments(bf(ctx, { deletedAt: null })),
    Contract.aggregate([
      { $match: bf(ctx, { status: { $in: ["active", "expiring_soon"] }, deletedAt: null }) },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    WorkOrder.countDocuments(bf(ctx, { type: "emergency", status: { $in: ["scheduled", "assigned", "in_progress"] }, deletedAt: null })),
    SparePartRequest.countDocuments(bf(ctx, { status: "pending_manager_approval", deletedAt: null })),
  ]);

  return {
    sales,
    service,
    finance,
    collection,
    customer,
    totalUsers,
    totalUnits,
    totalContractValue: totalContractValue[0]?.total ?? 0,
    activeEmergencies,
    pendingApprovals,
  };
}
