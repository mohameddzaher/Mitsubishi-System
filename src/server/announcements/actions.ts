"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Announcement, AuditLog, User } from "@/models";
import { requireRole } from "@/lib/session";
import { UserRole } from "@/config/roles";
import { createNotifications } from "@/server/notifications/actions";

const createSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  scope: z.enum(["branch", "department", "role", "global"]).default("branch"),
  scopeValue: z.string().optional(),
  pinned: z.coerce.boolean().default(false),
  notifyUsers: z.coerce.boolean().default(true),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.CHAIRMAN,
    UserRole.CEO,
    UserRole.COO,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_HR,
    UserRole.HEAD_OF_SALES,
    UserRole.HEAD_OF_SERVICE,
    UserRole.HEAD_OF_FINANCE,
    UserRole.HEAD_OF_COLLECTION,
    UserRole.HEAD_OF_PROCUREMENT,
    UserRole.HEAD_OF_IT,
    UserRole.HEAD_OF_CUSTOMER_CARE,
  ]);
  const data = createSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const announcement = await Announcement.create({
    title: data.title,
    body: data.body,
    authorId: session.user.id,
    scope: data.scope,
    scopeValue: data.scopeValue ?? "",
    branchId: session.user.branchId,
    priority: data.priority,
    pinned: data.pinned,
  });

  if (data.notifyUsers) {
    const filter: Record<string, unknown> = { status: "active", deletedAt: null };
    if (data.scope === "branch") filter.branchId = session.user.branchId;
    if (data.scope === "role" && data.scopeValue) filter.role = data.scopeValue;

    const recipients = await User.find(filter).select("_id").lean();
    await createNotifications(
      recipients.map((u) => ({
        userId: u._id,
        type: "system",
        title: `📢 ${data.title}`,
        body: data.body.slice(0, 200),
        link: `/announcements`,
        priority: data.priority,
        actorId: session.user.id,
        entityType: "announcement",
        entityId: announcement._id,
      })),
    );
  }

  await AuditLog.create({
    userId: session.user.id,
    action: "create_announcement",
    resource: "settings",
    resourceId: announcement._id,
    resourceLabel: announcement.title,
    branchId: session.user.branchId,
  });

  revalidatePath("/announcements");
  redirect("/announcements");
}

export async function acknowledgeAnnouncement(announcementId: string) {
  const session = await requireRole([
    ...Object.values(UserRole).filter((r) => r !== UserRole.CUSTOMER),
  ] as UserRole[]);
  await connectDB();

  await Announcement.updateOne(
    { _id: announcementId, "acknowledgedBy.userId": { $ne: session.user.id } },
    { $push: { acknowledgedBy: { userId: session.user.id, at: new Date() } } },
  );

  revalidatePath("/announcements");
  return { success: true };
}
