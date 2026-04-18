import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/session";
import { ROLE_LABELS, ROLE_TIERS, UserRole } from "@/config/roles";
import { ROLE_PERMISSIONS } from "@/config/permissions";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({ params }: { params: Promise<{ role: string }> }) {
  await requireRole([UserRole.SUPER_ADMIN, UserRole.HEAD_OF_IT]);
  const { role } = await params;
  if (!(role in ROLE_LABELS)) notFound();
  const typedRole = role as UserRole;
  const perms = ROLE_PERMISSIONS[typedRole] ?? [];

  // Group by resource
  const byResource = new Map<string, typeof perms>();
  for (const p of perms) {
    const list = byResource.get(p.resource) ?? [];
    list.push(p);
    byResource.set(p.resource, list);
  }

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/settings/roles" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All roles
        </Link>
      </div>
      <PageHeader
        title={ROLE_LABELS[typedRole]}
        description={
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px]">{role}</span>
            <Badge variant="outline">Tier {ROLE_TIERS[typedRole]}</Badge>
            <Badge>{perms.length} permissions</Badge>
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Actions allowed</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(byResource.entries()).map(([resource, list]) => (
                <TableRow key={resource}>
                  <TableCell className="font-mono text-xs">{resource}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {list.map((p, i) => (
                        <Badge key={i} variant="outline">{p.action}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        list[0]?.scope === "global"
                          ? "danger"
                          : list[0]?.scope === "branch"
                            ? "warning"
                            : list[0]?.scope === "team" || list[0]?.scope === "department"
                              ? "info"
                              : "outline"
                      }
                    >
                      {list[0]?.scope}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
