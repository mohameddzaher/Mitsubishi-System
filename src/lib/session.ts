import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { PermissionContext } from "@/config/permissions";
import { hasPermission, type Action, type Resource, type Target } from "@/config/permissions";
import { UserRole } from "@/config/roles";

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}

export async function getPermissionContext(): Promise<PermissionContext | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };
}

export async function can(resource: Resource, action: Action, target?: Target): Promise<boolean> {
  const ctx = await getPermissionContext();
  if (!ctx) return false;
  return hasPermission(ctx, resource, action, target);
}

export async function enforce(resource: Resource, action: Action, target?: Target): Promise<void> {
  const allowed = await can(resource, action, target);
  if (!allowed) throw new Error(`Forbidden: cannot ${action} ${resource}`);
}
