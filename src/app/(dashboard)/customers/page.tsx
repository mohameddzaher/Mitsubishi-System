import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { CustomerStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, TrendingUp, MapPin } from "lucide-react";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Unit } from "@/models";
import { scopedFilter } from "@/server/filters";
import { formatPercent, formatDate, formatCurrency } from "@/lib/utils";
import { CUSTOMER_TYPE_LABELS, type CustomerStatus, type CustomerType } from "@/config/constants";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  type?: string;
  q?: string;
}>;

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) filter.status = sp.status;
  if (sp.type) filter.type = sp.type;
  if (sp.q) {
    Object.assign(filter, { $text: { $search: sp.q } });
  }

  const [customers, statsAgg, unitCounts] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("assignedSalesRepId", "firstName lastName")
      .lean(),
    Customer.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 }, totalValue: { $sum: "$totalLifetimeValue" } } },
    ]),
    Unit.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$customerId", count: { $sum: 1 } } },
    ]),
  ]);

  const unitCountMap = new Map(unitCounts.map((u) => [String(u._id), u.count]));
  const totalByStatus = new Map(statsAgg.map((s) => [s._id, s.count]));
  const active = totalByStatus.get("active") ?? 0;
  const pipeline =
    (totalByStatus.get("lead") ?? 0) +
    (totalByStatus.get("qualified") ?? 0) +
    (totalByStatus.get("quotation_sent") ?? 0) +
    (totalByStatus.get("negotiating") ?? 0);
  const total = Array.from(totalByStatus.values()).reduce((a, b) => a + b, 0);
  const activeRatio = active + pipeline > 0 ? (active / (active + pipeline)) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description={`${total} total · ${active} active · ${pipeline} in pipeline`}
        actions={
          <Button asChild>
            <Link href="/customers/new">+ New customer</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active" value={active} icon={<Users className="size-4" />} accent="success" />
        <KpiCard label="In pipeline" value={pipeline} icon={<TrendingUp className="size-4" />} accent="info" />
        <KpiCard
          label="Active ratio"
          value={formatPercent(activeRatio, 0)}
          delta={{ value: activeRatio - 40, label: "vs 40% target" }}
          icon={<Target className="size-4" />}
          accent={activeRatio < 40 ? "warning" : "success"}
        />
        <KpiCard
          label="On hold / churned"
          value={(totalByStatus.get("on_hold") ?? 0) + (totalByStatus.get("churned") ?? 0)}
          icon={<MapPin className="size-4" />}
          accent="default"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill label="All" href="/customers" active={!sp.status} />
        <FilterPill label="Active" href="/customers?status=active" active={sp.status === "active"} />
        <FilterPill label="Leads" href="/customers?status=lead" active={sp.status === "lead"} />
        <FilterPill
          label="Qualified"
          href="/customers?status=qualified"
          active={sp.status === "qualified"}
        />
        <FilterPill
          label="Quotation sent"
          href="/customers?status=quotation_sent"
          active={sp.status === "quotation_sent"}
        />
        <FilterPill
          label="Negotiating"
          href="/customers?status=negotiating"
          active={sp.status === "negotiating"}
        />
        <FilterPill label="On hold" href="/customers?status=on_hold" active={sp.status === "on_hold"} />
        <FilterPill label="Churned" href="/customers?status=churned" active={sp.status === "churned"} />
      </div>

      <SimpleTable
        data={customers}
        rowHref={(row) => `/customers/${String((row as { _id: unknown })._id)}`}
        getKey={(row) => String((row as { _id: unknown })._id)}
        columns={[
          {
            key: "code",
            header: "Code",
            accessor: (row) => (
              <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                {(row as { code: string }).code}
              </span>
            ),
          },
          {
            key: "name",
            header: "Commercial name",
            accessor: (row) => {
              const c = row as { commercialName: string; legalName?: string };
              return (
                <div>
                  <div className="text-[12.5px] font-medium">{c.commercialName}</div>
                  {c.legalName && c.legalName !== c.commercialName && (
                    <div className="text-[10px] text-[var(--color-text-muted)]">{c.legalName}</div>
                  )}
                </div>
              );
            },
          },
          {
            key: "type",
            header: "Type",
            accessor: (row) => (
              <Badge variant="outline">
                {CUSTOMER_TYPE_LABELS[(row as { type: CustomerType }).type]}
              </Badge>
            ),
          },
          {
            key: "status",
            header: "Status",
            accessor: (row) => <CustomerStatusBadge status={(row as { status: CustomerStatus }).status} />,
          },
          {
            key: "salesRep",
            header: "Sales rep",
            accessor: (row) => {
              const sr = (row as { assignedSalesRepId: { firstName?: string; lastName?: string } | null }).assignedSalesRepId;
              return (
                <span className="text-xs">
                  {sr ? `${sr.firstName ?? ""} ${sr.lastName ?? ""}` : "—"}
                </span>
              );
            },
          },
          {
            key: "units",
            header: "Units",
            align: "right",
            accessor: (row) => (
              <span className="font-mono text-xs">
                {unitCountMap.get(String((row as { _id: unknown })._id)) ?? 0}
              </span>
            ),
          },
          {
            key: "activated",
            header: "Activated",
            accessor: (row) => {
              const c = row as { activatedAt?: Date | null };
              return c.activatedAt ? (
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {formatDate(c.activatedAt)}
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
              );
            },
          },
          {
            key: "credit",
            header: "Credit limit",
            align: "right",
            accessor: (row) => (
              <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                {formatCurrency((row as { creditLimit?: number }).creditLimit ?? 0)}
              </span>
            ),
          },
        ]}
        emptyTitle="No customers found"
        emptyDescription="Try a different filter or create your first customer."
      />

      {!customers.length && (
        <Card>
          <CardContent className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            Seed data may not have loaded for this branch. Run <code className="font-mono">npm run seed:reset</code>.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FilterPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)]"
          : "rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)]"
      }
    >
      {label}
    </Link>
  );
}
