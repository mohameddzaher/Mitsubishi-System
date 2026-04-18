"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { hasPermission, type Action, type Resource, type Target } from "@/config/permissions";

export function Can({
  resource,
  action,
  target,
  fallback = null,
  children,
}: {
  resource: Resource;
  action: Action;
  target?: Target;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { data } = useSession();
  if (!data?.user) return <>{fallback}</>;
  const allowed = hasPermission(
    {
      userId: data.user.id,
      role: data.user.role,
      branchId: data.user.branchId,
      departmentId: data.user.departmentId,
    },
    resource,
    action,
    target,
  );
  return <>{allowed ? children : fallback}</>;
}
