import "server-only";
import type { FilterQuery } from "mongoose";
import { UserRole } from "@/config/roles";
import type { Session } from "next-auth";

export function scopedFilter<T>(
  session: Session,
  base: FilterQuery<T> = {},
): FilterQuery<T> {
  const role = session.user.role;
  if (role === UserRole.SUPER_ADMIN || role === UserRole.CHAIRMAN || role === UserRole.CEO) {
    return base;
  }
  if (session.user.branchId) {
    return { ...base, branchId: session.user.branchId } as FilterQuery<T>;
  }
  return base;
}
