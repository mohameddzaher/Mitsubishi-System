import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Branch, User, Customer, Unit } from "@/models";
import { Building, MapPin, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  await requireSession();
  await connectDB();
  const branches = await Branch.find({ deletedAt: null })
    .populate("managerId", "firstName lastName")
    .lean();

  const withStats = await Promise.all(
    branches.map(async (b) => {
      const [userCount, customerCount, unitCount] = await Promise.all([
        User.countDocuments({ branchId: b._id, deletedAt: null, status: "active" }),
        Customer.countDocuments({ branchId: b._id, deletedAt: null }),
        Unit.countDocuments({ branchId: b._id, deletedAt: null }),
      ]);
      return { ...b, userCount, customerCount, unitCount };
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Branches" description="MELSA regional offices" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {withStats.map((b) => {
          const mgr = b.managerId as unknown as { firstName?: string; lastName?: string } | null;
          return (
            <Link key={String(b._id)} href={`/settings/branches/${b._id}`}>
              <Card className="h-full transition-colors hover:border-[var(--color-border-default)]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building className="size-4 text-[var(--color-brand)]" />
                        <div className="text-sm font-semibold">{b.name}</div>
                      </div>
                      <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{b.code}</div>
                    </div>
                    {b.isHeadquarters && <Badge variant="gold">HQ</Badge>}
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-1"><MapPin className="size-3" /> {b.city} · {b.region}</div>
                    <div className="flex items-center gap-1"><Phone className="size-3" /> {b.phone}</div>
                    {mgr && <div>Manager: {mgr.firstName} {mgr.lastName}</div>}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--color-border-subtle)] pt-2 text-center">
                    <Stat label="Staff" value={b.userCount} />
                    <Stat label="Customers" value={b.customerCount} />
                    <Stat label="Units" value={b.unitCount} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-sm font-semibold">{value}</div>
      <div className="text-[9px] uppercase text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}
