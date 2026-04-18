"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { WorkOrder, Unit, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { createNotification } from "@/server/notifications/actions";

const schema = z.object({
  unitId: z.string().regex(/^[a-f0-9]{24}$/i),
  technicianId: z.string().regex(/^[a-f0-9]{24}$/i),
  type: z.enum(["preventive", "corrective", "emergency", "inspection", "installation", "modernization", "safety_test", "follow_up"]),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  scheduledDate: z.string(),
  scheduledTime: z.string().default("09:00"),
  expectedDurationMinutes: z.coerce.number().min(15).default(60),
  supervisorId: z.string().optional(),
  notes: z.string().optional(),
});

const DEFAULT_CHECKLIST = [
  { itemId: "c1", label: "Check motor temperature and vibration", category: "mechanical", required: true },
  { itemId: "c2", label: "Inspect traveling cables for wear", category: "electrical", required: true },
  { itemId: "c3", label: "Test emergency brake", category: "safety", required: true },
  { itemId: "c4", label: "Verify door operator alignment", category: "doors", required: true },
  { itemId: "c5", label: "Lubricate guide rails", category: "mechanical", required: true },
  { itemId: "c6", label: "Test overload sensor", category: "safety", required: true },
  { itemId: "c7", label: "Check cabin interior and lighting", category: "interior", required: false },
  { itemId: "c8", label: "Verify floor indicator operation", category: "electrical", required: false },
  { itemId: "c9", label: "Test emergency communication system", category: "safety", required: true },
  { itemId: "c10", label: "Inspect buffer oil level", category: "mechanical", required: false },
];

export async function createWorkOrder(formData: FormData) {
  const session = await requireSession();
  await enforce("work_orders", "create");
  const data = schema.parse(Object.fromEntries(formData));
  await connectDB();

  const unit = await Unit.findById(data.unitId).lean();
  if (!unit) throw new Error("Unit not found");

  const scheduledDate = new Date(data.scheduledDate);
  const code = `WO-MKK-${scheduledDate.getFullYear().toString().slice(2)}${String(scheduledDate.getMonth() + 1).padStart(2, "0")}${String(scheduledDate.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;

  const wo = await WorkOrder.create({
    code,
    type: data.type,
    priority: data.priority,
    status: "scheduled",
    customerId: unit.customerId,
    unitId: new mongoose.Types.ObjectId(data.unitId),
    contractId: unit.activeContractId,
    technicianId: new mongoose.Types.ObjectId(data.technicianId),
    supervisorId: data.supervisorId && /^[a-f0-9]{24}$/i.test(data.supervisorId) ? new mongoose.Types.ObjectId(data.supervisorId) : undefined,
    dispatchedById: session.user.id,
    scheduledDate,
    scheduledTime: data.scheduledTime,
    expectedDurationMinutes: data.expectedDurationMinutes,
    checklist: DEFAULT_CHECKLIST.map((i) => ({ ...i, completed: false, issue: false, notes: "" })),
    technicianNotes: data.notes ?? "",
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await createNotification({
    userId: data.technicianId,
    type: "visit_scheduled",
    title: "New visit scheduled",
    body: `${scheduledDate.toDateString()} at ${data.scheduledTime} — ${unit.model}`,
    link: `/service/work-orders/${wo._id}`,
    priority: data.priority === "critical" ? "critical" : "normal",
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_work_order",
    resource: "work_orders",
    resourceId: wo._id,
    resourceLabel: wo.code,
    branchId: session.user.branchId,
  });

  revalidatePath("/service/work-orders");
  revalidatePath("/service/schedule");
  revalidatePath("/service/dispatch");
  redirect(`/service/work-orders/${wo._id}`);
}
