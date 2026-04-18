"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Search, Command, LogOut, User as UserIcon, Settings, ShieldCheck, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";
import { initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/config/roles";
import type { UserRole } from "@/config/roles";

export function Topbar({
  user,
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    avatar: string;
    employeeId: string | null;
  };
}) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/95 px-4 backdrop-blur-md lg:pl-6">
        {/* Center-left search */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 flex-1 items-center gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)] lg:max-w-md"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search customers, units, work orders…</span>
          <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--color-text-muted)] sm:inline-flex">
            <Command className="size-2.5" />K
          </kbd>
        </button>

        {/* Right side: notifications + user */}
        <div className="ml-auto flex items-center gap-2">
          <NotificationsBell />

          <div className="h-6 w-px bg-[var(--color-border-subtle)]" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-[var(--color-bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]">
              <Avatar className="size-7">
                <AvatarFallback className="bg-[var(--color-brand-muted)] text-[var(--color-brand)]">
                  {initials(`${user.firstName} ${user.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left md:block">
                <div className="truncate text-[12px] font-medium leading-tight">
                  {user.firstName} {user.lastName}
                </div>
                <div className="truncate text-[10px] text-[var(--color-text-muted)]">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
              <ChevronDown className="hidden size-3 text-[var(--color-text-muted)] md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <div className="px-2 py-1.5">
                <div className="text-xs font-semibold">
                  {user.firstName} {user.lastName}
                </div>
                <div className="truncate text-[10px] text-[var(--color-text-muted)]">
                  {user.email}
                </div>
                {user.employeeId && (
                  <div className="mt-1 font-mono text-[10px] text-[var(--color-text-muted)]">
                    ID: {user.employeeId}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserIcon /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/preferences">
                  <Settings /> Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/security">
                  <ShieldCheck /> Security
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/notifications">
                  <UserIcon /> Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-[var(--color-danger)]"
              >
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
