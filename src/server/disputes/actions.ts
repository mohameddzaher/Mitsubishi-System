"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Dispute, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { createNotification } from "@/server/notifications/actions";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(["customer_complaint", "payment_dispute", "quality_issue", "technician_issue", "internal", "vendor_issue", "other"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  customerId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export async function createDispute(formData: FormData) {
  const session = await requireSession();
  await enforce("disputes", "create");

  const raw = Object.fromEntries(formData);
  const parsed = createSchema.parse(raw);
  await connectDB();

  const count = await Dispute.countDocuments({ branchId: session.user.branchId });
  const code = `DSP-MKK-${String(count + 1).padStart(4, "0")}`;

  const slaHours = parsed.severity === "critical" ? 4 : parsed.severity === "high" ? 12 : 48;

  const dispute = await Dispute.create({
    code,
    title: parsed.title,
    description: parsed.description ?? "",
    raisedById: session.user.id,
    raisedByType: "employee",
    customerId: parsed.customerId && /^[a-f0-9]{24}$/i.test(parsed.customerId) ? new mongoose.Types.ObjectId(parsed.customerId) : undefined,
    category: parsed.category,
    severity: parsed.severity,
    status: "open",
    currentAssigneeId: parsed.assigneeId && /^[a-f0-9]{24}$/i.test(parsed.assigneeId) ? new mongoose.Types.ObjectId(parsed.assigneeId) : undefined,
    slaTargetHours: slaHours,
    timeline: parsed.assigneeId
      ? [{ type: "assigned", toUserId: parsed.assigneeId, at: new Date(), note: "Initial assignment" }]
      : [],
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  if (parsed.assigneeId) {
    await createNotification({
      userId: parsed.assigneeId,
      type: "dispute_raised",
      title: "New dispute assigned to you",
      body: parsed.title,
      link: `/disputes/${dispute._id}`,
      priority: parsed.severity === "critical" ? "critical" : "high",
      actorId: session.user.id,
      entityType: "dispute",
      entityId: dispute._id,
    });
  }

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "create_dispute",
    resource: "disputes",
    resourceId: dispute._id,
    resourceLabel: dispute.code,
    branchId: session.user.branchId,
  });

  revalidatePath("/disputes");
  redirect(`/disputes/${dispute._id}`);
}

export async function forwardDispute(disputeId: string, toUserId: string, note: string) {
  const session = await requireSession();
  const id = idSchema.parse(disputeId);
  const userId = idSchema.parse(toUserId);
  await connectDB();

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new Error("Dispute not found");

  const prev = dispute.currentAssigneeId;
  dispute.currentAssigneeId = userId as unknown as typeof dispute.currentAssigneeId;
  dispute.timeline.push({
    type: "forwarded",
    fromUserId: prev,
    toUserId: userId,
    note,
    at: new Date(),
  } as unknown as (typeof dispute.timeline)[number]);
  await dispute.save();

  await createNotification({
    userId,
    type: "dispute_forwarded",
    title: "A dispute has been forwarded to you",
    body: `${dispute.title} · ${note}`,
    link: `/disputes/${disputeId}`,
    priority: "high",
  });

  revalidatePath(`/disputes/${disputeId}`);
  return { success: true };
}

export async function resolveDispute(disputeId: string, resolutionSummary: string, rootCause?: string) {
  const session = await requireSession();
  const id = idSchema.parse(disputeId);
  await connectDB();

  const dispute = await Dispute.findById(id);
  if (!dispute) throw new Error("Dispute not found");

  dispute.status = "resolved";
  dispute.resolutionSummary = resolutionSummary;
  if (rootCause) dispute.rootCause = rootCause;
  dispute.resolvedAt = new Date();
  dispute.timeline.push({
    type: "resolved",
    fromUserId: session.user.id,
    at: new Date(),
    note: resolutionSummary,
  } as unknown as (typeof dispute.timeline)[number]);
  await dispute.save();

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    action: "resolve_dispute",
    resource: "disputes",
    resourceId: dispute._id,
    resourceLabel: dispute.code,
    branchId: dispute.branchId,
  });

  revalidatePath(`/disputes/${disputeId}`);
  return { success: true };
}
