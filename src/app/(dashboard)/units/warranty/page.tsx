import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models";
import { scopedFilter } from "@/server/filters";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SimpleTable } from "@/components/data-table/simple-table";
import { KpiCard } from "@/components/kpi-card";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WarrantyTrackerPage() {
  const session = await requireSession();
  await connectDB();

  const now = new Date();
  const in90 = new Date(Date.now() + 90 * 86_400_000);

  const units = await Unit.find(scopedFilter(session, { deletedAt: null }))
    .populate("customerId", "commercialName code")
    .lean();

  const inWarranty = units.filter((u) => u.warrantyEnd && new Date(u.warrantyEnd) > in90);
  const expiringSoon = units.filter((u) => u.warrantyEnd && new Date(u.warrantyEnd) > now && new Date(u.warrantyEnd) <= in90);
  const expired = units.filter((u) => u.warrantyEnd && new Date(u.warrantyEnd) < now);
  const noWarranty = units.filter((u) => !u.warrantyEnd);

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/units" className="text-[var(--color-text-muted)]">← All units</Link></div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Shield className="size-4 text-[var(--color-brand)]" /> Warranty tracker
          </span>
        }
        description={`${units.length} units under management · group by warranty status`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="In warranty" value={inWarranty.length} icon={<ShieldCheck className="size-4" />} accent="success" />
        <KpiCard label="Expiring in 90 days" value={expiringSoon.length} icon={<ShieldAlert className="size-4" />} accent={expiringSoon.length > 0 ? "warning" : "default"} />
        <KpiCard label="Expired" value={expired.length} icon={<ShieldX className="size-4" />} accent="default" />
        <KpiCard label="No warranty data" value={noWarranty.length} icon={<Shield className="size-4" />} />
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-[var(--color-warning)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--color-warning)]">
              <ShieldAlert className="size-4" /> Warranties expiring in the next 90 days
            </CardTitle>
            <CardDescription>Proactive outreach opportunity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTable
              data={expiringSoon}
              getKey={(r) => String((r as { _id: unknown })._id)}
              rowHref={(r) => `/units/${String((r as { _id: unknown })._id)}`}
              columns={[
                { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                { key: "model", header: "Model", accessor: (r) => <span className="text-xs">{(r as { model: string }).model}</span> },
                {
                  key: "customer",
                  header: "Customer",
                  accessor: (r) => {
                    const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                    return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
                  },
                },
                {
                  key: "expires",
                  header: "Expires",
                  accessor: (r) => {
                    const u = r as { warrantyEnd: Date };
                    const days = Math.floor((new Date(u.warrantyEnd).getTime() - Date.now()) / 86_400_000);
                    return (
                      <span className="text-[11px]">
                        {formatDate(u.warrantyEnd)} <Badge variant="warning">{days}d</Badge>
                      </span>
                    );
                  },
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>In warranty ({inWarranty.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <SimpleTable
            data={inWarranty.slice(0, 50)}
            getKey={(r) => String((r as { _id: unknown })._id)}
            rowHref={(r) => `/units/${String((r as { _id: unknown })._id)}`}
            columns={[
              { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
              { key: "model", header: "Model", accessor: (r) => <span className="text-xs">{(r as { model: string }).model}</span> },
              {
                key: "customer",
                header: "Customer",
                accessor: (r) => {
                  const c = (r as { customerId: { commercialName?: string } | null }).customerId;
                  return <span className="text-xs">{c?.commercialName ?? "—"}</span>;
                },
              },
              {
                key: "installed",
                header: "Installed",
                accessor: (r) => <span className="text-[11px]">{formatDate((r as { installedAt: Date }).installedAt)}</span>,
              },
              {
                key: "expires",
                header: "Warranty ends",
                accessor: (r) => <span className="text-[11px]">{formatDate((r as { warrantyEnd: Date }).warrantyEnd)}</span>,
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
