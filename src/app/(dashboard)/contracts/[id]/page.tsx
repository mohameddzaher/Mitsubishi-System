import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Contract, Unit, Invoice } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { InvoiceStatusBadge, UnitStatusDot } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileSignature, Calendar, Coins, Building2 } from "lucide-react";
import { CONTRACT_TYPE_LABELS, type ContractType, type InvoiceStatus, type UnitStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let contract;
  try {
    contract = await Contract.findById(id).populate("customerId", "commercialName code").lean();
  } catch {
    notFound();
  }
  if (!contract) notFound();

  const c = contract.customerId as unknown as { _id: unknown; commercialName?: string; code?: string } | null;

  const [units, invoices] = await Promise.all([
    Unit.find({ _id: { $in: contract.unitIds ?? [] }, deletedAt: null }).lean(),
    Invoice.find({ contractId: id, deletedAt: null }).sort({ issueDate: -1 }).lean(),
  ]);

  const daysRemaining = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
  const totalPaid = invoices.reduce((a, i) => a + (i.paidAmount ?? 0), 0);
  const totalBalance = invoices.reduce((a, i) => a + (i.balance ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/contracts" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All contracts
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <FileSignature className="size-4 text-[var(--color-brand)]" />
            <span className="font-mono">{contract.code}</span>
            <Badge variant="outline">{CONTRACT_TYPE_LABELS[contract.type as ContractType]}</Badge>
            <Badge
              variant={
                contract.status === "active"
                  ? "success"
                  : contract.status === "expiring_soon"
                    ? "warning"
                    : contract.status === "expired"
                      ? "danger"
                      : "outline"
              }
            >
              {String(contract.status).replace(/_/g, " ")}
            </Badge>
          </span>
        }
        description={c ? (
          <Link href={`/customers/${String(c._id)}`} className="hover:text-[var(--color-text-primary)]">
            {c.commercialName} · {c.code}
          </Link>
        ) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/contracts/${id}/renew`}>Renew</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/finance/invoices/new?contractId=${id}`}>+ Generate invoice</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Contract value" value={formatCurrency(contract.total)} icon={<Coins className="size-4" />} />
        <KpiCard label="Units covered" value={contract.unitCount} icon={<Building2 className="size-4" />} accent="info" />
        <KpiCard
          label={daysRemaining > 0 ? "Days remaining" : "Days overdue"}
          value={Math.abs(daysRemaining)}
          hint={formatDate(contract.endDate)}
          icon={<Calendar className="size-4" />}
          accent={daysRemaining < 30 ? "warning" : daysRemaining < 0 ? "danger" : "default"}
        />
        <KpiCard label="Paid / Balance" value={formatCurrency(totalPaid)} hint={`Outstanding: ${formatCurrency(totalBalance)}`} accent={totalBalance > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Start date">{formatDate(contract.startDate)}</Row>
            <Row label="End date">{formatDate(contract.endDate)}</Row>
            <Row label="Duration">{contract.durationMonths} months</Row>
            <Row label="Billing cycle">{String(contract.billingCycle).replace("_", " ")}</Row>
            <Row label="Payment timing">{String(contract.paymentTiming).replace("_", " ")}</Row>
            <Row label="Visit frequency">{contract.visitFrequency}</Row>
            <Row label="Visits per year">{contract.visitsPerYear}</Row>
            <Row label="Auto renew">{contract.autoRenew ? "Yes" : "No"}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage & SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <Row label="Spare parts covered">{contract.coverage?.sparePartsCovered ? "✓" : "—"}</Row>
            <Row label="Labor covered">{contract.coverage?.laborCovered ? "✓" : "—"}</Row>
            <Row label="Emergency included">{contract.coverage?.emergencyIncluded ? "✓" : "—"}</Row>
            <Row label="Modernization included">{contract.coverage?.modernizationIncluded ? "✓" : "—"}</Row>
            <Row label="Response time SLA">{contract.sla?.responseTimeMinutes} min</Row>
            <Row label="Resolution SLA">{contract.sla?.resolutionTimeHours} hours</Row>
            <Row label="Price">{formatCurrency(contract.price)}</Row>
            <Row label="VAT (15%)">{formatCurrency(contract.vatAmount)}</Row>
            <Row label="Total">{formatCurrency(contract.total)}</Row>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="units">
            <TabsList>
              <TabsTrigger value="units">Covered units ({units.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="units">
              <SimpleTable
                data={units}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/units/${String((row as { _id: unknown })._id)}`}
                columns={[
                  { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                  { key: "model", header: "Model", accessor: (r) => <span className="text-xs">{(r as { model: string }).model}</span> },
                  { key: "type", header: "Type", accessor: (r) => <Badge variant="outline">{String((r as { type: string }).type).replace("_", " ")}</Badge> },
                  { key: "status", header: "Status", accessor: (r) => <UnitStatusDot status={(r as { currentStatus: UnitStatus }).currentStatus} /> },
                ]}
                emptyTitle="No units"
              />
            </TabsContent>
            <TabsContent value="invoices">
              <SimpleTable
                data={invoices}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/finance/invoices/${String((row as { _id: unknown })._id)}`}
                columns={[
                  { key: "code", header: "Code", accessor: (r) => <span className="font-mono text-[11px]">{(r as { code: string }).code}</span> },
                  { key: "issued", header: "Issued", accessor: (r) => <span className="text-[11px]">{formatDate((r as { issueDate: Date }).issueDate)}</span> },
                  { key: "due", header: "Due", accessor: (r) => <span className="text-[11px]">{formatDate((r as { dueDate: Date }).dueDate)}</span> },
                  { key: "total", header: "Total", align: "right", accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { total: number }).total)}</span> },
                  { key: "balance", header: "Balance", align: "right", accessor: (r) => <span className="font-mono text-xs">{formatCurrency((r as { balance: number }).balance)}</span> },
                  { key: "status", header: "Status", accessor: (r) => <InvoiceStatusBadge status={(r as { status: InvoiceStatus }).status} /> },
                ]}
                emptyTitle="No invoices"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-1.5 last:border-0 last:pb-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span>{children}</span>
    </div>
  );
}
