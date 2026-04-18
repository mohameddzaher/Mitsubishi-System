"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/config/navigation";
import type { UserRole } from "@/config/roles";
import { hasPermission } from "@/config/permissions";
import { APP } from "@/config/constants";

type Ctx = {
  role: UserRole;
  branchId: string | null;
  departmentId: string | null;
  userId: string;
};

export function Sidebar({ ctx }: { ctx: Ctx }) {
  const pathname = usePathname();

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

  const sections = new Map<string, typeof visibleNav>();
  const topLevel: typeof visibleNav = [];
  for (const item of visibleNav) {
    if (item.section) {
      const list = sections.get(item.section) ?? [];
      list.push(item);
      sections.set(item.section, list);
    } else {
      topLevel.push(item);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-[var(--color-brand)] text-white">
          <span className="text-sm font-bold">M</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">{APP.name}</div>
          <div className="truncate text-[10px] text-[var(--color-text-muted)]">
            {APP.branchName} · Dark Luxury
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {topLevel.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {Array.from(sections.entries()).map(([section, items]) => (
          <div key={section} className="mt-5">
            <div className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              {section}
            </div>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border-subtle)] px-3 py-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span>System online</span>
          <span className="ml-auto text-[var(--color-text-disabled)]">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof NAV)[number];
  pathname: string;
}) {
  const isActive =
    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = (Icons[item.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.Circle;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-colors",
        isActive
          ? "bg-[var(--color-brand-muted)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
