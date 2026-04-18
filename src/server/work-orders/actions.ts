"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { WorkOrder, AuditLog, SparePart, SparePartRequest, Notification, User } from "@/models";
import { requireSession } from "@/lib/session";
import { UserRole } from "@/config/roles";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const sparePartRequestInputSchema = z.object({
  partId: z.string().regex(/^[a-f0-9]{24}$/i),
  qty: z.coerce.number().int().min(1).max(999),
  priority: z.enum(["urgent", "normal", "scheduled"]).default("normal"),
  reason: z.string().trim().max(500).default(""),
});

export type SparePartRequestInput = z.infer<typeof sparePartRequestInputSchema>;

export async function startVisit(workOrderId: string, lat?: number, lng?: number) {
  const session = await requireSession();
  const id = idSchema.parse(workOrderId);
  await connectDB();

  const wo = await WorkOrder.findById(id);
  if (!wo) throw new Error("Work order not found");
  if (String(wo.technicianId) !== session.user.id) {
    throw new Error("Only the assigned technician can start this visit");
  }
  if (wo.status !== "scheduled" && wo.status !== "assigned") {
    throw new Error(`Cannot start a visit in status: ${wo.status}`);
  }

  wo.status = "in_progress";
  wo.actualStartAt = new Date();
  if (lat && lng) {
    wo.startLocation = { lat, lng, accuracy: 20 };
  }
  await wo.save();

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "start_visit",
    resource: "work_orders",
    resourceId: wo._id,
    resourceLabel: wo.code,
    newValue: { status: "in_progress", actualStartAt: wo.actualStartAt },
    branchId: wo.branchId,
  });

  revalidatePath(`/service/work-orders/${id}`);
  revalidatePath("/service/my-day");
  return { success: true };
}

export async function endVisit(
  workOrderId: string,
  options?: {
    notes?: string;
    lat?: number;
    lng?: number;
    sparePartRequests?: SparePartRequestInput[];
  },
) {
  const session = await requireSession();
  const id = idSchema.parse(workOrderId);
  const sparePartInputs = (options?.sparePartRequests ?? []).map((r) =>
    sparePartRequestInputSchema.parse(r),
  );
  await connectDB();

  const wo = await WorkOrder.findById(id);
  if (!wo) throw new Error("Work order not found");
  if (String(wo.technicianId) !== session.user.id) {
    throw new Error("Only the assigned technician can end this visit");
  }
  if (wo.status !== "in_progress") {
    throw new Error(`Cannot end a visit that is not in progress (current: ${wo.status})`);
  }

  wo.status = "completed";
  wo.actualEndAt = new Date();
  if (wo.actualStartAt) {
    wo.actualDurationMinutes = Math.round(
      (wo.actualEndAt.getTime() - wo.actualStartAt.getTime()) / 60_000,
    );
    wo.durationVarianceMinutes = wo.actualDurationMinutes - wo.expectedDurationMinutes;
  }
  if (options?.notes) wo.technicianNotes = options.notes;
  if (options?.lat && options?.lng) {
    wo.endLocation = { lat: options.lat, lng: options.lng, accuracy: 20 };
  }

  const createdRequestIds: mongoose.Types.ObjectId[] = [];
  if (sparePartInputs.length > 0) {
    const partIds = sparePartInputs.map((r) => new mongoose.Types.ObjectId(r.partId));
    const parts = await SparePart.find({
      _id: { $in: partIds },
      branchId: wo.branchId,
      deletedAt: null,
    })
      .select("name partNumber")
      .lean();
    const partMap = new Map(parts.map((p) => [String(p._id), p]));
    if (parts.length !== partIds.length) {
      throw new Error("One or more selected spare parts could not be found in this branch");
    }

    const today = new Date();
    const datePrefix = `SPR-MKK-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < sparePartInputs.length; i++) {
      const input = sparePartInputs[i]!;
      const part = partMap.get(input.partId)!;
      const code = `${datePrefix}-${String(Date.now() % 100000).padStart(5, "0")}-${i}`;
      const req = await SparePartRequest.create({
        code,
        workOrderId: wo._id,
        technicianId: session.user.id,
        customerId: wo.customerId,
        unitId: wo.unitId,
        partId: part._id,
        partNameSnapshot: part.name,
        qty: input.qty,
        priority: input.priority,
        reason: input.reason,
        status: "pending_manager_approval",
        timeline: [
          {
            status: "pending_manager_approval",
            at: new Date(),
            byId: session.user.id,
            note: input.reason || "Requested from End Visit",
          },
        ],
        branchId: wo.branchId,
      });
      createdRequestIds.push(req._id);
    }

    wo.sparePartRequestIds = [...(wo.sparePartRequestIds ?? []), ...createdRequestIds];

    const managers = await User.find({
      branchId: wo.branchId,
      role: { $in: [UserRole.SERVICE_MANAGER, UserRole.SERVICE_SUPERVISOR, UserRole.HEAD_OF_SERVICE] },
      status: "active",
      deletedAt: null,
    })
      .select("_id")
      .lean();

    if (managers.length > 0) {
      const partNames = sparePartInputs
        .map((r) => `${partMap.get(r.partId)!.name} ×${r.qty}`)
        .join(", ");
      await Notification.insertMany(
        managers.map((m) => ({
          userId: m._id,
          type: "spare_approval_needed",
          title: `Spare parts need approval · ${wo.code}`,
          body: `${session.user.firstName} ${session.user.lastName} requested: ${partNames}`,
          link: `/spare-parts/requests?status=pending_manager_approval`,
          priority: sparePartInputs.some((r) => r.priority === "urgent") ? "high" : "normal",
          entityType: "spare_part_request",
          entityId: createdRequestIds[0],
        })),
      );
    }
  }

  await wo.save();

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "end_visit",
    resource: "work_orders",
    resourceId: wo._id,
    resourceLabel: wo.code,
    newValue: {
      status: "completed",
      actualEndAt: wo.actualEndAt,
      durationMinutes: wo.actualDurationMinutes,
      sparePartRequests: createdRequestIds.length,
    },
    branchId: wo.branchId,
  });

  revalidatePath(`/service/work-orders/${id}`);
  revalidatePath("/service/my-day");
  revalidatePath("/spare-parts/requests");
  return { success: true, sparePartRequestsCreated: createdRequestIds.length };
}

export async function toggleChecklistItem(workOrderId: string, itemId: string, completed: boolean) {
  const session = await requireSession();
  await connectDB();

  const wo = await WorkOrder.findById(workOrderId);
  if (!wo) throw new Error("Work order not found");
  if (String(wo.technicianId) !== session.user.id) {
    throw new Error("Only the assigned technician can update the checklist");
  }

  const item = wo.checklist?.find((i) => i.itemId === itemId);
  if (!item) throw new Error("Checklist item not found");
  item.completed = completed;
  wo.markModified("checklist");
  await wo.save();

  revalidatePath(`/service/work-orders/${workOrderId}`);
  return { success: true };
}

export async function submitVisitRating(workOrderId: string, rating: number, comment?: string) {
  await connectDB();
  const id = idSchema.parse(workOrderId);

  const wo = await WorkOrder.findById(id);
  if (!wo) throw new Error("Work order not found");
  if (wo.status !== "completed") throw new Error("Can only rate completed visits");

  wo.customerFeedback = {
    rating,
    comment: comment ?? "",
    submittedAt: new Date(),
    submittedFromPortal: true,
  };
  await wo.save();

  revalidatePath(`/portal/visits/${id}`);
  revalidatePath(`/service/work-orders/${id}`);
  return { success: true };
}
