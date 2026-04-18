"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task, AuditLog, Notification } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { createNotifications } from "@/server/notifications/actions";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  dueDate: z.string().optional(),
  assigneeIds: z.union([z.string(), z.array(z.string())]).optional(),
  relatedType: z.enum(["customer", "unit", "contract", "invoice", "workorder", "quotation", "opportunity", "dispute", "none"]).optional(),
  relatedId: z.string().optional(),
});

export async function createTask(formData: FormData) {
  const session = await requireSession();
  await enforce("tasks", "create");

  const raw = Object.fromEntries(formData);
  const parsed = createSchema.parse(raw);
  await connectDB();

  let assigneeIds: mongoose.Types.ObjectId[] = [];
  if (typeof parsed.assigneeIds === "string" && parsed.assigneeIds) {
    assigneeIds = parsed.assigneeIds.split(",").filter(Boolean).map((s) => new mongoose.Types.ObjectId(s));
  } else if (Array.isArray(parsed.assigneeIds)) {
    assigneeIds = parsed.assigneeIds.map((s) => new mongoose.Types.ObjectId(s));
  }

  const task = await Task.create({
    title: parsed.title,
    description: parsed.description ?? "",
    assignerId: session.user.id,
    assigneeIds,
    priority: parsed.priority,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    status: "todo",
    relatedType: parsed.relatedType ?? "none",
    relatedId: parsed.relatedId && /^[a-f0-9]{24}$/i.test(parsed.relatedId) ? new mongoose.Types.ObjectId(parsed.relatedId) : undefined,
    branchId: session.user.branchId,
    createdBy: session.user.id,
  });

  await createNotifications(
    assigneeIds.map((userId) => ({
      userId,
      type: "task_assigned",
      title: "New task assigned",
      body: parsed.title,
      link: `/tasks/${task._id}`,
      priority: parsed.priority === "urgent" ? "critical" : parsed.priority === "high" ? "high" : "normal",
      actorId: session.user.id,
      entityType: "task",
      entityId: task._id,
    })),
  );

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    userRole: session.user.role,
    action: "create_task",
    resource: "tasks",
    resourceId: task._id,
    resourceLabel: task.title,
    branchId: session.user.branchId,
  });

  revalidatePath("/tasks");
  redirect(`/tasks/${task._id}`);
}

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await requireSession();
  const id = idSchema.parse(taskId);
  await connectDB();

  const task = await Task.findById(id);
  if (!task) throw new Error("Task not found");

  const validStatuses = ["todo", "in_progress", "pending_review", "blocked", "done", "cancelled"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const allowed =
    task.assigneeIds.some((a) => String(a) === session.user.id) ||
    String(task.assignerId) === session.user.id;
  if (!allowed) throw new Error("You cannot update this task");

  task.status = status as typeof task.status;
  if (status === "done") {
    task.completedAt = new Date();
    task.completedById = session.user.id as unknown as typeof task.completedById;
  }
  await task.save();

  // Notify assigner
  if (status === "done" && String(task.assignerId) !== session.user.id) {
    await Notification.create({
      userId: task.assignerId,
      type: "task_commented",
      title: "Task completed",
      body: `${session.user.firstName} ${session.user.lastName} completed: ${task.title}`,
      link: `/tasks/${taskId}`,
      priority: "normal",
    });
  }

  await AuditLog.create({
    userId: session.user.id,
    userName: `${session.user.firstName} ${session.user.lastName}`,
    action: "update_task_status",
    resource: "tasks",
    resourceId: task._id,
    resourceLabel: task.title,
    newValue: { status },
    branchId: task.branchId,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  return { success: true };
}

export async function addTaskComment(taskId: string, text: string) {
  const session = await requireSession();
  const id = idSchema.parse(taskId);
  if (!text.trim()) throw new Error("Comment cannot be empty");
  await connectDB();

  const task = await Task.findById(id);
  if (!task) throw new Error("Task not found");
  task.comments.push({
    userId: session.user.id,
    text: text.trim(),
    attachments: [],
    createdAt: new Date(),
  } as unknown as (typeof task.comments)[number]);
  await task.save();

  // Notify everyone in the task except the commenter
  const toNotify = new Set<string>([String(task.assignerId), ...task.assigneeIds.map((a) => String(a))]);
  toNotify.delete(session.user.id);
  await createNotifications(
    Array.from(toNotify).map((userId) => ({
      userId,
      type: "task_commented",
      title: `${session.user.firstName} commented on a task`,
      body: text.slice(0, 120),
      link: `/tasks/${taskId}`,
    })),
  );

  revalidatePath(`/tasks/${taskId}`);
  return { success: true };
}
