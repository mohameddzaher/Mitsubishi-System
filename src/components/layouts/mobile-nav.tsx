"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/config/navigation";
import type { UserRole } from "@/config/roles";
import { hasPermission } from "@/config/permissions";
import { APP } from "@/config/constants";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function MobileNav({
  ctx,
}: {
  ctx: {
    role: UserRole;
    branchId: string | null;
    departmentId: string | null;
    userId: string;
  };
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const visibleNav = NAV.filter((item) => {
    if (item.roles && !item.roles.includes(ctx.role)) return false;
    if (item.resource) {
      return hasPermission(
        {
          userId: ctx.userId,
          role: ctx.role,
          branchId: ctx.branchId,
          departmentId: ctx.departmentId,
        },
        item.resource,
        "view",
      );
    }
    return true;
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-0 top-0 h-screen max-w-[280px] -translate-x-0 -translate-y-0 overflow-y-auto rounded-none border-0 p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-white">
              <span className="text-xs font-bold">M</span>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold leading-tight">{APP.name}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">{APP.branchName}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="size-7 rounded-md hover:bg-[var(--color-bg-elevated)]"
              aria-label="Close"
            >
              <X className="mx-auto size-3.5" />
            </button>
          </div>
          <nav className="p-2">
            {visibleNav.map((item) => {
              const Icon = (Icons[item.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.Circle;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-[13px]",
                    active
                      ? "bg-[var(--color-brand-muted)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]",
                  )}
                >
                  <Icon className="size-4 text-[var(--color-text-muted)]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
