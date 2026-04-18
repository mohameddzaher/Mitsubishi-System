"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { WorkOrder, AuditLog } from "@/models";
import { requireSession } from "@/lib/session";
import { UserRole } from "@/config/roles";

const OVERRIDE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CHAIRMAN,
  UserRole.CEO,
  UserRole.BRANCH_MANAGER,
  UserRole.HEAD_OF_SERVICE,
  UserRole.SERVICE_MANAGER,
  UserRole.SERVICE_SUPERVISOR,
  UserRole.DISPATCH_MANAGER,
];

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

export async function addVisitPhoto(
  workOrderId: string,
  kind: "before" | "after",
  url: string,
  caption = "",
) {
  const session = await requireSession();
  const id = idSchema.parse(workOrderId);
  if (!url || !url.startsWith("http")) throw new Error("Invalid URL");

  await connectDB();
  const wo = await WorkOrder.findById(id);
  if (!wo) throw new Error("Work order not found");
  if (!OVERRIDE_ROLES.includes(session.user.role) && String(wo.technicianId) !== session.user.id) {
    throw new Error("Only the assigned technician or a service lead can upload photos");
  }

  const field = kind === "before" ? "beforePhotos" : "afterPhotos";
  wo[field].push({
    url,
    caption,
    uploadedAt: new Date(),
    uploadedBy: session.user.id,
  } as unknown as (typeof wo.beforePhotos)[number]);
  await wo.save();

  await AuditLog.create({
    userId: session.user.id,
    action: `add_${kind}_photo`,
    resource: "work_orders",
    resourceId: wo._id,
    resourceLabel: wo.code,
    branchId: wo.branchId,
  });

  revalidatePath(`/service/work-orders/${id}`);
  return { success: true };
}

export async function removeVisitPhoto(
  workOrderId: string,
  kind: "before" | "after",
  url: string,
) {
  const session = await requireSession();
  const id = idSchema.parse(workOrderId);
  await connectDB();

  const wo = await WorkOrder.findById(id);
  if (!wo) throw new Error("Work order not found");
  if (!OVERRIDE_ROLES.includes(session.user.role) && String(wo.technicianId) !== session.user.id) {
    throw new Error("Only the assigned technician or a service lead can remove photos");
  }

  const field = kind === "before" ? "beforePhotos" : "afterPhotos";
  wo[field] = wo[field].filter((p) => p.url !== url) as typeof wo.beforePhotos;
  await wo.save();

  revalidatePath(`/service/work-orders/${id}`);
  return { success: true };
}
