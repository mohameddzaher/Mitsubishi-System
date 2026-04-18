"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Unit, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const editSchema = z.object({
  model: z.string().min(1),
  type: z.enum(["passenger", "freight", "hospital", "observation", "service", "home", "escalator", "moving_walk"]),
  currentStatus: z.enum(["operational", "under_maintenance", "breakdown", "decommissioned", "modernization"]),
  capacity: z.coerce.number().min(0),
  speed: z.coerce.number().min(0),
  floorsServed: z.coerce.number().min(0),
  serialNumber: z.string().optional(),
  building: z.string().optional(),
});

export async function updateUnit(unitId: string, formData: FormData) {
  const session = await requireSession();
  await enforce("units", "edit");
  const id = idSchema.parse(unitId);
  const data = editSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const unit = await Unit.findById(id);
  if (!unit) throw new Error("Unit not found");

  unit.set({
    model: data.model,
    type: data.type,
    currentStatus: data.currentStatus,
    capacity: data.capacity,
    speed: data.speed,
    floorsServed: data.floorsServed,
    ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
    ...(data.building !== undefined ? { "location.building": data.building } : {}),
    updatedBy: session.user.id,
  });
  await unit.save();

  await AuditLog.create({
    userId: session.user.id,
    action: "update_unit",
    resource: "units",
    resourceId: unit._id,
    resourceLabel: unit.code,
    newValue: { status: unit.currentStatus },
    branchId: unit.branchId,
  });

  revalidatePath(`/units/${id}`);
  revalidatePath("/units");
  redirect(`/units/${id}`);
}
