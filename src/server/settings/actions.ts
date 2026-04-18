"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Setting, AuditLog } from "@/models";
import { requireSession } from "@/lib/session";

export async function updateSetting(key: string, value: unknown, scope: "global" | "branch" | "user" | "department" = "branch") {
  const session = await requireSession();
  await connectDB();

  const scopeId = scope === "branch" ? session.user.branchId : scope === "user" ? session.user.id : undefined;

  await Setting.updateOne(
    { key, scope, scopeId },
    { $set: { key, value, scope, scopeId } },
    { upsert: true },
  );

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    action: "update_setting",
    resource: "settings",
    resourceLabel: key,
    newValue: { [key]: value },
    branchId: session.user.branchId,
  });

  revalidatePath("/settings");
  revalidatePath("/settings/kpi-config");
  revalidatePath("/settings/sla");
  return { success: true };
}
