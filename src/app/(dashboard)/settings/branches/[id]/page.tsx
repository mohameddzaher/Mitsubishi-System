import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Branch, Department, User } from "@/models";
import { Building, Phone, Mail, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let branch;
  try {
    branch = await Branch.findById(id).populate("managerId", "firstName lastName email").lean();
  } catch {
    notFound();
  }
  if (!branch) notFound();

  const [departments, staff] = await Promise.all([
    Department.find({ branchId: id, deletedAt: null }).lean(),
    User.find({ branchId: id, deletedAt: null }).limit(30).lean(),
  ]);

  const mgr = branch.managerId as unknown as { firstName?: string; lastName?: string; email?: string } | null;

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/settings/branches" className="text-[var(--color-text-muted)]">← Branches</Link></div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Building className="size-4 text-[var(--color-brand)]" /> {branch.name}
          </span>
        }
        description={`${branch.code} · ${branch.city}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><MapPin className="size-3" /> {branch.address}</div>
            <div className="flex items-center gap-2"><Phone className="size-3" /> {branch.phone}</div>
            <div className="flex items-center gap-2"><Mail className="size-3" /> {branch.email || "—"}</div>
            {mgr && <div>Manager: {mgr.firstName} {mgr.lastName} · {mgr.email}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Working hours</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>Saturday–Thursday: {branch.workingHours?.sat_thu ?? "08:00-17:00"}</div>
            <div>Friday: {branch.workingHours?.friday ?? "Closed"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Departments ({departments.length})</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <div key={String(d._id)} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-xs">
              <div className="font-medium">{d.name}</div>
              <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{d.code}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Staff ({staff.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-[var(--color-text-muted)]">
            {staff.length} active team members. <Link href="/settings/users" className="text-[var(--color-brand)]">View all →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
