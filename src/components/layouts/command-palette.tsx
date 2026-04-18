"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Users,
  Building2,
  FileText,
  Wrench,
  Receipt,
  CheckSquare,
  LayoutDashboard,
  Radio,
  CalendarDays,
  Coins,
  AlertTriangle,
  ArrowRight,
  Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const QUICK_ACTIONS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "Navigate" },
  { label: "Customers", href: "/customers", icon: Users, section: "Navigate" },
  { label: "Units", href: "/units", icon: Building2, section: "Navigate" },
  { label: "Work orders", href: "/service/work-orders", icon: Wrench, section: "Navigate" },
  { label: "Monthly planner", href: "/service/schedule", icon: CalendarDays, section: "Navigate" },
  { label: "Dispatch", href: "/service/dispatch", icon: Radio, section: "Navigate" },
  { label: "Invoices", href: "/finance/invoices", icon: Receipt, section: "Navigate" },
  { label: "Collection", href: "/finance/collection", icon: Coins, section: "Navigate" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, section: "Navigate" },
  { label: "Disputes", href: "/disputes", icon: AlertTriangle, section: "Navigate" },
  { label: "Quotations", href: "/sales/quotations", icon: FileText, section: "Navigate" },
  { label: "New customer", href: "/customers/new", icon: Users, section: "Create" },
  { label: "New work order", href: "/service/work-orders/new", icon: Wrench, section: "Create" },
  { label: "New task", href: "/tasks/new", icon: CheckSquare, section: "Create" },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <Command className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-3">
            <Search className="size-3.5 text-[var(--color-text-muted)]" />
            <Command.Input
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent py-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
            <kbd className="text-[10px] text-[var(--color-text-muted)]">ESC</kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-xs text-[var(--color-text-muted)]">
              No results found.
            </Command.Empty>

            {["Navigate", "Create"].map((section) => (
              <Command.Group
                key={section}
                heading={section}
                className="mb-2 [&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--color-text-muted)]"
              >
                {QUICK_ACTIONS.filter((a) => a.section === section).map((a) => {
                  const Icon = a.icon;
                  return (
                    <Command.Item
                      key={a.href}
                      value={a.label}
                      onSelect={() => go(a.href)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-[12.5px] text-[var(--color-text-primary)] data-[selected=true]:bg-[var(--color-bg-overlay)]"
                    >
                      <Icon className="size-3.5 text-[var(--color-text-muted)]" />
                      <span className="flex-1">{a.label}</span>
                      <ArrowRight className="size-3 text-[var(--color-text-muted)]" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
