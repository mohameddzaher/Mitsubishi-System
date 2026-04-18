"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export function PortalNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {items.map((it) => {
        const Icon = (Icons[it.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.Circle;
        const active = pathname === it.href || (it.href !== "/portal" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
              active
                ? "bg-[var(--color-brand-muted)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Icon className={cn("size-3.5", active ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]")} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
