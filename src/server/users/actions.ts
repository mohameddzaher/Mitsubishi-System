"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User, Department, AuditLog } from "@/models";
import { requireSession, enforce } from "@/lib/session";
import { UserRole } from "@/config/roles";
import { hashPassword } from "@/lib/auth";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole),
  departmentId: z.string().optional(),
  password: z.string().min(8).default("Melsa@2026!"),
});

export async function createUser(formData: FormData) {
  const session = await requireSession();
  await enforce("users", "create");

  const data = createSchema.parse(Object.fromEntries(formData));
  await connectDB();

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) throw new Error("User with this email already exists");

  const count = await User.countDocuments({});
  const employeeId = `EMP-${String(count + 1).padStart(5, "0")}`;

  const passwordHash = await hashPassword(data.password);

  const user = await User.create({
    email: data.email.toLowerCase(),
    phone: data.phone ?? "",
    passwordHash,
    employeeId,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
    departmentId: data.departmentId && /^[a-f0-9]{24}$/i.test(data.departmentId) ? data.departmentId : undefined,
    branchId: session.user.branchId,
    status: "active",
    mustChangePassword: true,
    createdBy: session.user.id,
  });

  await AuditLog.create({
    userId: session.user.id,
    action: "create_user",
    resource: "users",
    resourceId: user._id,
    resourceLabel: `${user.firstName} ${user.lastName}`,
    branchId: session.user.branchId,
  });

  revalidatePath("/settings/users");
  redirect(`/settings/users/${user._id}`);
}

export async function suspendUser(userId: string) {
  const session = await requireSession();
  await enforce("users", "edit");
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { status: "suspended" } });
  await AuditLog.create({
    userId: session.user.id,
    action: "suspend_user",
    resource: "users",
    resourceId: userId,
    branchId: session.user.branchId,
  });
  revalidatePath("/settings/users");
  return { success: true };
}

export async function activateUser(userId: string) {
  const session = await requireSession();
  await enforce("users", "edit");
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { status: "active" } });
  await AuditLog.create({
    userId: session.user.id,
    action: "activate_user",
    resource: "users",
    resourceId: userId,
    branchId: session.user.branchId,
  });
  revalidatePath("/settings/users");
  return { success: true };
}
