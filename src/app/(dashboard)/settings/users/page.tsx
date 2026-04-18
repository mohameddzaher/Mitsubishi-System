import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { ROLE_LABELS, UserRole, isExecutive } from "@/config/roles";
import { initials } from "@/lib/utils";
import { Users, UserCheck, UserX, UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_HR,
    UserRole.HR_MANAGER,
    UserRole.HEAD_OF_IT,
    UserRole.IT_MANAGER,
    UserRole.CHAIRMAN,
    UserRole.CEO,
  ]);

  await connectDB();

  const users = await User.find({ deletedAt: null })
    .sort({ role: 1, firstName: 1 })
    .populate("departmentId", "name code")
    .lean();

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    roles: new Set(users.map((u) => u.role)).size,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team"
        description={`${stats.total} users across ${stats.roles} roles`}
        actions={
          <Button asChild>
            <Link href="/settings/users/new">+ Invite user</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total users" value={stats.total} icon={<Users className="size-4" />} />
        <KpiCard label="Active" value={stats.active} icon={<UserCheck className="size-4" />} accent="success" />
        <KpiCard label="Suspended" value={stats.suspended} icon={<UserX className="size-4" />} accent={stats.suspended > 0 ? "warning" : "default"} />
        <KpiCard label="Distinct roles" value={stats.roles} icon={<UserCog className="size-4" />} />
      </div>

      <SimpleTable
        data={users}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/team/${String((row as { _id: unknown })._id)}`}
        columns={[
          {
            key: "name",
            header: "Name",
            accessor: (row) => {
              const u = row as { firstName: string; lastName: string; email: string };
              return (
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">{initials(`${u.firstName} ${u.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">{u.email}</div>
                  </div>
                </div>
              );
            },
          },
          {
            key: "employeeId",
            header: "ID",
            accessor: (row) => <span className="font-mono text-[10px]">{(row as { employeeId?: string }).employeeId ?? "—"}</span>,
          },
          {
            key: "role",
            header: "Role",
            accessor: (row) => {
              const role = (row as { role: UserRole }).role;
              return (
                <Badge variant={isExecutive(role) ? "gold" : "outline"}>
                  {ROLE_LABELS[role]}
                </Badge>
              );
            },
          },
          {
            key: "department",
            header: "Department",
            accessor: (row) => {
              const d = (row as { departmentId: { name?: string } | null }).departmentId;
              return <span className="text-xs">{d?.name ?? "—"}</span>;
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (row) => {
              const s = (row as { status: string }).status;
              return (
                <Badge variant={s === "active" ? "success" : s === "suspended" ? "warning" : "danger"}>
                  {s}
                </Badge>
              );
            },
          },
        ]}
      />
    </div>
  );
}
