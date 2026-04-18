import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Contract, Unit, WorkOrder, Invoice } from "@/models";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, CalendarCheck, Receipt, Siren, CheckCircle2, FileSignature } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const session = await requireSession();
  await connectDB();

  const customer = session.user.employeeId
    ? await Customer.findOne({ code: session.user.employeeId }).lean()
    : null;

  if (!customer) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <EmptyState
          icon={<Building2 className="size-4" />}
          title="No customer account linked"
          description="Your portal account isn't linked to a customer yet. Please contact your MELSA account manager."
        />
      </div>
    );
  }

  const [units, contracts, upcomingVisits, outstandingInvoices] = await Promise.all([
    Unit.find({ customerId: customer._id, deletedAt: null }).lean(),
    Contract.find({ customerId: customer._id, status: { $in: ["active", "expiring_soon"] }, deletedAt: null }).lean(),
    WorkOrder.find({
      customerId: customer._id,
      scheduledDate: { $gte: new Date() },
      status: { $in: ["scheduled", "assigned"] },
      deletedAt: null,
    })
      .sort({ scheduledDate: 1 })
      .limit(5)
      .populate("unitId", "code model")
      .populate("technicianId", "firstName lastName")
      .lean(),
    Invoice.find({
      customerId: customer._id,
      status: { $in: ["issued", "sent", "viewed", "partially_paid", "overdue"] },
      deletedAt: null,
    })
      .sort({ dueDate: 1 })
      .lean(),
  ]);

  const totalOutstanding = outstandingInvoices.reduce((a, i) => a + (i.balance ?? 0), 0);
  const nextVisit = upcomingVisits[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">
          Welcome back, {customer.commercialName}
        </h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          Your MELSA Mecca customer portal — track your service, visits, and invoices.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="My units"
          value={units.length}
          hint={`${units.filter((u) => u.currentStatus === "operational").length} operational`}
          icon={<Building2 className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="Active contracts"
          value={contracts.length}
          icon={<FileSignature className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Next visit"
          value={nextVisit ? formatDate(nextVisit.scheduledDate) : "—"}
          hint={nextVisit ? nextVisit.scheduledTime : "No scheduled visits"}
          icon={<CalendarCheck className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          hint={`${outstandingInvoices.length} invoices`}
          icon={<Receipt className="size-4" />}
          accent={totalOutstanding > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Upcoming visits</CardTitle>
              <CardDescription>Scheduled service by our technicians</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/portal/visits">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingVisits.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="size-4" />}
                title="No upcoming visits"
                description="Your service schedule will appear here."
              />
            ) : (
              <div className="space-y-2">
                {upcomingVisits.map((v) => {
                  const u = v.unitId as unknown as { code?: string; model?: string } | null;
                  const t = v.technicianId as unknown as { firstName?: string; lastName?: string } | null;
                  return (
                    <div
                      key={String(v._id)}
                      className="flex items-start justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3"
                    >
                      <div>
                        <div className="text-xs font-medium">
                          {formatDate(v.scheduledDate)} at {v.scheduledTime}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {u?.model ?? "—"} · {String(v.type).replace("_", " ")}
                        </div>
                        {t && (
                          <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                            Technician: {t.firstName} {t.lastName}
                          </div>
                        )}
                      </div>
                      <Badge variant="info">Scheduled</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need help?</CardTitle>
            <CardDescription>We&apos;re available 24/7</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" asChild variant="danger">
              <Link href="/portal/support/emergency">
                <Siren /> Report emergency
              </Link>
            </Button>
            <Button className="w-full" variant="secondary" asChild>
              <Link href="/portal/support">
                <CheckCircle2 /> Open a support ticket
              </Link>
            </Button>
            <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">24/7 hotline</div>
              <a href="tel:8001282828" className="mt-1 block text-base font-semibold text-[var(--color-brand)]">
                8001282828
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
