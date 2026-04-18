import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { UserRole } from "@/config/roles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CUSTOMER_PORTAL_NAV } from "@/config/navigation";
import { APP } from "@/config/constants";
import { SignOutButton } from "@/components/layouts/sign-out-button";
import { PortalNav } from "./portal-nav";
import { initials } from "@/lib/utils";
import { LogOut, User as UserIcon } from "lucide-react";

export default async function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.user.role !== UserRole.CUSTOMER) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4 lg:px-8">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--color-brand)] text-white">
              <span className="text-xs font-bold">M</span>
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-tight">{APP.name}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Customer portal</div>
            </div>
          </Link>

          <PortalNav items={CUSTOMER_PORTAL_NAV} />

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-[var(--color-bg-elevated)]">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-[var(--color-accent-gold-muted)] text-[var(--color-accent-gold)]">
                    {initials(`${session.user.firstName} ${session.user.lastName}`)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 text-left sm:block">
                  <div className="truncate text-[12px] font-medium">
                    {session.user.firstName} {session.user.lastName}
                  </div>
                  <div className="truncate text-[10px] text-[var(--color-text-muted)]">Customer</div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/portal/profile">
                    <UserIcon /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-[var(--color-danger)]">
                  <SignOutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] px-4 py-5 lg:px-8">{children}</main>
    </div>
  );
}
