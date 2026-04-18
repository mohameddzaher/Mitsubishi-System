import { Sidebar } from "@/components/layouts/sidebar";
import { Topbar } from "@/components/layouts/topbar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { requireSession } from "@/lib/session";
import { UserRole } from "@/config/roles";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.user.role === UserRole.CUSTOMER) redirect("/portal");

  const ctx = {
    userId: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
    departmentId: session.user.departmentId,
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <Sidebar ctx={ctx} />
      <div className="lg:pl-[240px]">
        <div className="flex items-center gap-2 px-3 lg:hidden">
          <MobileNav ctx={ctx} />
        </div>
        <Topbar
          user={{
            id: session.user.id,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            email: session.user.email ?? "",
            role: session.user.role,
            avatar: session.user.avatar,
            employeeId: session.user.employeeId,
          }}
        />
        <main className="mx-auto w-full max-w-[1920px] px-4 py-5 lg:px-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}
