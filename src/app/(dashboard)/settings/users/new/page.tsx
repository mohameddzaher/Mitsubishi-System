import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Department } from "@/models";
import { UserRole, ROLE_LABELS } from "@/config/roles";
import { createUser } from "@/server/users/actions";

export const dynamic = "force-dynamic";

const ROLE_GROUPS: Array<{ label: string; roles: UserRole[] }> = [
  { label: "Executive", roles: [UserRole.CHAIRMAN, UserRole.CEO, UserRole.COO, UserRole.CFO, UserRole.CTO, UserRole.CCO, UserRole.CIO] },
  { label: "Branch & Department Heads", roles: [UserRole.BRANCH_MANAGER, UserRole.DEPUTY_BRANCH_MANAGER, UserRole.HEAD_OF_SALES, UserRole.HEAD_OF_SERVICE, UserRole.HEAD_OF_FINANCE, UserRole.HEAD_OF_COLLECTION, UserRole.HEAD_OF_PROCUREMENT, UserRole.HEAD_OF_HR, UserRole.HEAD_OF_IT, UserRole.HEAD_OF_CUSTOMER_CARE, UserRole.HEAD_OF_QUALITY, UserRole.HEAD_OF_MARKETING, UserRole.HEAD_OF_WAREHOUSE, UserRole.HEAD_OF_INSTALLATION] },
  { label: "Managers", roles: [UserRole.SALES_MANAGER, UserRole.SERVICE_MANAGER, UserRole.DISPATCH_MANAGER, UserRole.INSTALLATION_MANAGER, UserRole.FINANCE_MANAGER, UserRole.COLLECTION_MANAGER, UserRole.PROCUREMENT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.HR_MANAGER, UserRole.CUSTOMER_CARE_MANAGER, UserRole.QUALITY_MANAGER, UserRole.IT_MANAGER, UserRole.PROJECT_MANAGER] },
  { label: "Supervisors", roles: [UserRole.SERVICE_SUPERVISOR, UserRole.INSTALLATION_SUPERVISOR, UserRole.COLLECTION_SUPERVISOR, UserRole.SALES_TEAM_LEADER, UserRole.ACCOUNTING_SUPERVISOR] },
  { label: "Field technicians", roles: [UserRole.SENIOR_TECHNICIAN, UserRole.SERVICE_TECHNICIAN, UserRole.INSTALLATION_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN] },
  { label: "Commercial", roles: [UserRole.SALES_EXECUTIVE, UserRole.SALES_ENGINEER, UserRole.ACCOUNT_MANAGER] },
  { label: "Finance & Collection", roles: [UserRole.ACCOUNTANT, UserRole.COLLECTION_OFFICER, UserRole.CASHIER] },
  { label: "Operations", roles: [UserRole.DISPATCHER, UserRole.CUSTOMER_CARE_AGENT, UserRole.RECEPTIONIST, UserRole.WAREHOUSE_OFFICER, UserRole.PROCUREMENT_OFFICER, UserRole.INVENTORY_CLERK, UserRole.HR_OFFICER, UserRole.QA_INSPECTOR, UserRole.SAFETY_OFFICER, UserRole.IT_SUPPORT, UserRole.DATA_ANALYST] },
];

export default async function NewUserPage() {
  const session = await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.DEPUTY_BRANCH_MANAGER,
    UserRole.HEAD_OF_HR,
    UserRole.HR_MANAGER,
    UserRole.HEAD_OF_IT,
    UserRole.IT_MANAGER,
  ]);
  await connectDB();

  const departments = await Department.find({ branchId: session.user.branchId }).sort({ name: 1 }).lean();

  const roleOptions = ROLE_GROUPS.flatMap((g) =>
    g.roles.map((r) => ({
      value: r,
      label: ROLE_LABELS[r],
      description: r,
      group: g.label,
    })),
  );

  const deptOptions = departments.map((d) => ({
    value: String(d._id),
    label: d.name,
    description: d.code,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/settings/users" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">← Team</Link></div>
      <PageHeader title="Invite user" description="Add a team member. They will be prompted to change password on first login." />

      <form action={createUser} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="firstName" label="First name *" required />
            <Field id="lastName" label="Last name *" required />
            <Field id="email" label="Work email *" type="email" required />
            <Field id="phone" label="Phone" placeholder="+9665..." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Role & department</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role">Role *</Label>
              <SearchableSelect
                name="role"
                options={roleOptions}
                placeholder="Select role…"
                searchPlaceholder="Search by role name or tier"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departmentId">Department</Label>
              <SearchableSelect
                name="departmentId"
                options={deptOptions}
                placeholder="None"
                searchPlaceholder="Search departments"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Initial password</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="text" defaultValue="Melsa@2026!" />
              <p className="text-[10px] text-[var(--color-text-muted)]">
                The user will be forced to change this on first login.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/settings/users">Cancel</Link></Button>
          <Button type="submit">Invite user</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, type = "text", required, placeholder }: { id: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
