import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit, User } from "@/models";
import { scopedFilter } from "@/server/filters";
import { UserRole, ROLE_LABELS } from "@/config/roles";
import { createWorkOrder } from "@/server/work-orders/create-action";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage({ searchParams }: { searchParams: Promise<{ unitId?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const todayIso = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in server-local timezone

  const [units, technicians, supervisors] = await Promise.all([
    Unit.find(scopedFilter(session, { deletedAt: null }))
      .select("code model customerId type")
      .sort({ code: 1 })
      .populate("customerId", "commercialName")
      .lean(),
    User.find({
      branchId: session.user.branchId,
      role: { $in: [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.INSTALLATION_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN] },
      status: "active",
      deletedAt: null,
    })
      .select("firstName lastName role employeeId email")
      .sort({ email: 1 })
      .lean(),
    User.find({
      branchId: session.user.branchId,
      role: { $in: [UserRole.SERVICE_SUPERVISOR, UserRole.SERVICE_MANAGER] },
      status: "active",
      deletedAt: null,
    })
      .select("firstName lastName role")
      .sort({ firstName: 1 })
      .lean(),
  ]);

  const unitOptions = units.map((u) => {
    const c = u.customerId as unknown as { commercialName?: string } | null;
    return {
      value: String(u._id),
      label: `${u.model} — ${u.code}`,
      description: c?.commercialName ? `${c.commercialName} · ${u.type}` : u.type,
    };
  });

  const techOptions = technicians.map((t) => ({
    value: String(t._id),
    label: `${t.firstName} ${t.lastName}`,
    description: `${t.email} · ${ROLE_LABELS[t.role] ?? t.role}`,
    group: ROLE_LABELS[t.role] ?? t.role,
  }));

  const supOptions = supervisors.map((s) => ({
    value: String(s._id),
    label: `${s.firstName} ${s.lastName}`,
    description: ROLE_LABELS[s.role] ?? s.role,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/service/work-orders" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All work orders
        </Link>
      </div>
      <PageHeader title="New work order" description="Schedule a visit — notifies the technician immediately." />

      <form action={createWorkOrder} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Visit</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="unitId">Unit *</Label>
              <SearchableSelect
                name="unitId"
                options={unitOptions}
                defaultValue={sp.unitId ?? ""}
                placeholder="Select unit…"
                searchPlaceholder="Search by code, model, or customer"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select id="type" name="type" aria-label="Visit type" title="Visit type" required defaultValue="preventive" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
                <option value="installation">Installation</option>
                <option value="modernization">Modernization</option>
                <option value="safety_test">Safety test</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority *</Label>
              <select id="priority" name="priority" aria-label="Priority" title="Priority" required defaultValue="medium" className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledDate">Date *</Label>
              <Input id="scheduledDate" name="scheduledDate" type="date" defaultValue={todayIso} min={todayIso} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledTime">Time</Label>
              <Input id="scheduledTime" name="scheduledTime" type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedDurationMinutes">Expected duration (min)</Label>
              <Input id="expectedDurationMinutes" name="expectedDurationMinutes" type="number" min={15} defaultValue={60} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Team</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="technicianId">Technician *</Label>
              <SearchableSelect
                name="technicianId"
                options={techOptions}
                placeholder="Assign technician…"
                searchPlaceholder="Search by name or role"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supervisorId">Supervisor</Label>
              <SearchableSelect
                name="supervisorId"
                options={supOptions}
                placeholder="Optional supervisor…"
                searchPlaceholder="Search"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="notes" placeholder="Specific instructions for the technician…" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/service/work-orders">Cancel</Link></Button>
          <Button type="submit">Schedule visit</Button>
        </div>
      </form>
    </div>
  );
}
