import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { ROLE_LABELS, ROLE_TIERS, UserRole, isExecutive } from "@/config/roles";
import { ROLE_PERMISSIONS } from "@/config/permissions";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requireRole([UserRole.SUPER_ADMIN, UserRole.CHAIRMAN, UserRole.CEO, UserRole.HEAD_OF_IT, UserRole.HEAD_OF_HR]);
  await connectDB();

  const counts = await User.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(counts.map((c) => [c._id as string, c.count as number]));

  // Group roles by tier
  const tiers: Array<{ range: [number, number]; label: string; roles: UserRole[] }> = [
    { range: [85, 100], label: "Executive", roles: [] },
    { range: [65, 84], label: "Branch & Heads", roles: [] },
    { range: [55, 64], label: "Managers", roles: [] },
    { range: [45, 54], label: "Supervisors", roles: [] },
    { range: [20, 44], label: "Team members", roles: [] },
    { range: [0, 19], label: "External", roles: [] },
  ];

  (Object.keys(ROLE_TIERS) as UserRole[]).forEach((role) => {
    const tier = ROLE_TIERS[role];
    const slot = tiers.find((t) => tier >= t.range[0] && tier <= t.range[1]);
    if (slot) slot.roles.push(role);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Roles & tiers" description={`${Object.keys(ROLE_LABELS).length} roles organized into ${tiers.length} tiers`} />

      {tiers.map((tier) => (
        <div key={tier.label}>
          <div className="mb-2 flex items-center gap-2">
            <Shield className="size-3.5 text-[var(--color-brand)]" />
            <h2 className="text-sm font-semibold">{tier.label}</h2>
            <Badge variant="outline">
              Tier {tier.range[0]}–{tier.range[1]}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tier.roles.map((role) => {
              const count = countMap.get(role) ?? 0;
              const perms = ROLE_PERMISSIONS[role]?.length ?? 0;
              return (
                <Link key={role} href={`/settings/roles/${role}`}>
                  <Card className="h-full transition-colors hover:border-[var(--color-border-default)]">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {isExecutive(role) && <span className="text-[var(--color-accent-gold)]">◆ </span>}
                            {ROLE_LABELS[role]}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-text-muted)]">{role}</div>
                        </div>
                        <div className="text-right text-[10px] text-[var(--color-text-muted)]">
                          <div className="font-mono">{count} users</div>
                          <div>{perms} perms</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
