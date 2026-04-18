"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models";
import { requireSession } from "@/lib/session";
import mongoose from "mongoose";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

export async function markNotificationRead(notificationId: string) {
  const session = await requireSession();
  const id = idSchema.parse(notificationId);
  await connectDB();
  await Notification.updateOne(
    { _id: id, userId: session.user.id },
    { $set: { readAt: new Date() } },
  );
  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await connectDB();
  await Notification.updateMany(
    { userId: session.user.id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  revalidatePath("/notifications");
  return { success: true };
}

export async function archiveNotification(notificationId: string) {
  const session = await requireSession();
  const id = idSchema.parse(notificationId);
  await connectDB();
  await Notification.updateOne(
    { _id: id, userId: session.user.id },
    { $set: { archivedAt: new Date(), readAt: new Date() } },
  );
  revalidatePath("/notifications");
  return { success: true };
}

export async function bulkMarkRead(notificationIds: string[]) {
  const session = await requireSession();
  const ids = notificationIds.map((i) => idSchema.parse(i));
  await connectDB();
  await Notification.updateMany(
    { _id: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) }, userId: session.user.id },
    { $set: { readAt: new Date() } },
  );
  revalidatePath("/notifications");
  return { success: true };
}

export async function bulkArchive(notificationIds: string[]) {
  const session = await requireSession();
  const ids = notificationIds.map((i) => idSchema.parse(i));
  await connectDB();
  await Notification.updateMany(
    { _id: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) }, userId: session.user.id },
    { $set: { archivedAt: new Date(), readAt: new Date() } },
  );
  revalidatePath("/notifications");
  return { success: true };
}

export async function getRecentNotifications(limit = 10) {
  const session = await requireSession();
  await connectDB();
  const items = await Notification.find({
    userId: session.user.id,
    archivedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const unreadCount = await Notification.countDocuments({
    userId: session.user.id,
    readAt: null,
    archivedAt: null,
  });
  return { items: JSON.parse(JSON.stringify(items)) as typeof items, unreadCount };
}

export type NotificationCreateInput = {
  userId: string | mongoose.Types.ObjectId;
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority?: "critical" | "high" | "normal" | "low";
  actorId?: string | mongoose.Types.ObjectId;
  entityType?: string;
  entityId?: string | mongoose.Types.ObjectId;
};

export async function createNotification(input: NotificationCreateInput) {
  await connectDB();
  await Notification.create({
    ...input,
    priority: input.priority ?? "normal",
  });
}

export async function createNotifications(inputs: NotificationCreateInput[]) {
  if (inputs.length === 0) return;
  await connectDB();
  await Notification.insertMany(inputs.map((i) => ({ ...i, priority: i.priority ?? "normal" })));
}
