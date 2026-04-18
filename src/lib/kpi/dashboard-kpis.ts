import "server-only";
import { connectDB } from "@/lib/db";
import {
  Customer,
  Contract,
  Unit,
  Invoice,
  WorkOrder,
  Task,
  Dispute,
  SparePartRequest,
  Payment,
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
  if (ctx.role === UserRole.SUPER_ADMIN || ctx.role === UserRole.CHAIRMAN) {
    return base;
  }
  if (ctx.branchId) {
    return { ...base, branchId: ctx.branchId } as FilterQuery<T>;
  }
  return base;
}

export async function getDashboardKpis(ctx: Ctx) {
  await connectDB();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    activeCustomers,
    pipelineCustomers,
    totalCustomers,
    activeContracts,
    totalUnits,
    openInvoicesAgg,
    paidMtdAgg,
    visitsToday,
    visitsCompletedToday,
    pendingApprovals,
    expiringContracts,
    openTasks,
    openDisputes,
    overdueInvoices,
  ] = await Promise.all([
    Customer.countDocuments(branchFilter(ctx, { status: "active", deletedAt: null })),
    Customer.countDocuments(
      branchFilter(ctx, {
        status: { $in: ["lead", "qualified", "quotation_sent", "negotiating"] },
        deletedAt: null,
      }),
    ),
    Customer.countDocuments(branchFilter(ctx, { deletedAt: null })),
    Contract.countDocuments(
      branchFilter(ctx, {
        status: { $in: ["active", "expiring_soon"] },
        deletedAt: null,
      }),
    ),
    Unit.countDocuments(branchFilter(ctx, { deletedAt: null })),
    Invoice.aggregate([
      {
        $match: {
          ...branchFilter(ctx),
          status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          ...branchFilter(ctx),
          receivedAt: { $gte: monthStart },
          deletedAt: null,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    WorkOrder.countDocuments(
      branchFilter(ctx, {
        scheduledDate: { $gte: today, $lt: tomorrow },
        deletedAt: null,
      }),
    ),
    WorkOrder.countDocuments(
      branchFilter(ctx, {
        scheduledDate: { $gte: today, $lt: tomorrow },
        status: "completed",
        deletedAt: null,
      }),
    ),
    SparePartRequest.countDocuments(
      branchFilter(ctx, {
        status: "pending_manager_approval",
        deletedAt: null,
      }),
    ),
    Contract.countDocuments(
      branchFilter(ctx, {
        endDate: { $gte: today, $lte: thirtyDaysFromNow },
        status: { $in: ["active", "expiring_soon"] },
        deletedAt: null,
      }),
    ),
    Task.countDocuments(
      branchFilter(ctx, {
        status: { $in: ["todo", "in_progress", "pending_review"] },
        deletedAt: null,
      }),
    ),
    Dispute.countDocuments(
      branchFilter(ctx, {
        status: { $in: ["open", "investigating", "escalated"] },
        deletedAt: null,
      }),
    ),
    Invoice.countDocuments(
      branchFilter(ctx, {
        status: "overdue",
        deletedAt: null,
      }),
    ),
  ]);

  const totalAR = openInvoicesAgg[0]?.total ?? 0;
  const collectedMtd = paidMtdAgg[0]?.total ?? 0;
  const activeDenominator = activeCustomers + pipelineCustomers;
  const activeRatio =
    activeDenominator > 0 ? (activeCustomers / activeDenominator) * 100 : 0;

  return {
    activeCustomers,
    pipelineCustomers,
    totalCustomers,
    activeContracts,
    totalUnits,
    totalAR,
    openInvoicesCount: openInvoicesAgg[0]?.count ?? 0,
    collectedMtd,
    activeRatio,
    visitsToday,
    visitsCompletedToday,
    pendingApprovals,
    expiringContracts,
    openTasks,
    openDisputes,
    overdueInvoices,
  };
}

export async function getArAging(ctx: Ctx) {
  await connectDB();
  const result = await Invoice.aggregate([
    {
      $match: {
        ...branchFilter(ctx),
        status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] },
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: "$agingBucket",
        total: { $sum: "$balance" },
        count: { $sum: 1 },
      },
    },
  ]);

  const buckets = ["current", "1-30", "31-60", "61-90", "90+"] as const;
  return buckets.map((bucket) => {
    const match = result.find((r) => r._id === bucket);
    return {
      bucket,
      total: match?.total ?? 0,
      count: match?.count ?? 0,
    };
  });
}

export async function getRecentWorkOrders(ctx: Ctx, limit = 8) {
  await connectDB();
  return WorkOrder.find(branchFilter(ctx, { deletedAt: null }))
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("customerId", "commercialName code")
    .populate("unitId", "code model")
    .populate("technicianId", "firstName lastName")
    .lean();
}

export async function getCustomerStatusDistribution(ctx: Ctx) {
  await connectDB();
  const result = await Customer.aggregate([
    { $match: { ...branchFilter(ctx), deletedAt: null } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return result.map((r) => ({ status: r._id, count: r.count }));
}
