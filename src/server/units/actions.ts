"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Unit, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";

const schema = z.object({
  customerId: z.string().regex(/^[a-f0-9]{24}$/i),
  model: z.string().min(1),
  type: z.enum(["passenger", "freight", "hospital", "observation", "service", "home", "escalator", "moving_walk"]),
  capacity: z.coerce.number().min(0),
  speed: z.coerce.number().min(0),
  floorsServed: z.coerce.number().min(0),
  travelDistance: z.coerce.number().min(0).optional(),
  serialNumber: z.string().optional(),
  building: z.string().optional(),
});

export async function createUnit(formData: FormData) {
  const session = await requireSession();
  await enforce("units", "create");
  const data = schema.parse(Object.fromEntries(formData));
  await connectDB();

  const count = await Unit.countDocuments({ branchId: session.user.branchId });
  const code = `UNIT-MKK-${String(count + 1).padStart(6, "0")}`;

  const unit = await Unit.create({
    code,
    serialNumber: data.serialNumber ?? "",
    model: data.model,
    type: data.type,
    capacity: data.capacity,
    speed: data.speed,
    floorsServed: data.floorsServed,
    travelDistance: data.travelDistance ?? 0,
    customerId: new mongoose.Types.ObjectId(data.customerId),
    location: { building: data.building ?? "" },
    currentStatus: "operational",
    installedAt: new Date(),
    qrCode: `QR-${code}-${Math.floor(Math.random() * 9999)}`,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_unit",
    resource: "units",
    resourceId: unit._id,
    resourceLabel: unit.code,
    branchId: session.user.branchId,
  });

  revalidatePath("/units");
  redirect(`/units/${unit._id}`);
}
