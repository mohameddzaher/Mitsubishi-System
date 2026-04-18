import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Unit, Contract, Invoice, WorkOrder, Note } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CustomerStatusBadge,
  InvoiceStatusBadge,
  UnitStatusDot,
  WorkOrderStatusBadge,
} from "@/components/status-badge";
import { SimpleTable } from "@/components/data-table/simple-table";
import { formatCurrency, formatDate, formatDateTime, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Receipt,
  FileSignature,
  ExternalLink,
  Wrench,
} from "lucide-react";
import type { CustomerType, CustomerStatus, InvoiceStatus, UnitStatus, WorkOrderStatus } from "@/config/constants";
import { CUSTOMER_TYPE_LABELS } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let customer;
  try {
    customer = await Customer.findById(id)
      .populate("assignedSalesRepId", "firstName lastName email")
      .populate("assignedCollectionOfficerId", "firstName lastName email")
      .populate("assignedAccountManagerId", "firstName lastName email")
      .populate("branchId", "name code")
      .lean();
  } catch {
    notFound();
  }
  if (!customer) notFound();

  const [units, contracts, invoices, workOrders, notes] = await Promise.all([
    Unit.find({ customerId: id, deletedAt: null }).lean(),
    Contract.find({ customerId: id, deletedAt: null }).sort({ createdAt: -1 }).lean(),
    Invoice.find({ customerId: id, deletedAt: null }).sort({ issueDate: -1 }).limit(20).lean(),
    WorkOrder.find({ customerId: id, deletedAt: null })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .populate("unitId", "code model")
      .populate("technicianId", "firstName lastName")
      .lean(),
    Note.find({ relatedType: "customer", relatedId: id, deletedAt: null }).sort({ createdAt: -1 }).lean(),
  ]);

  const totalOutstanding = invoices.reduce((a, inv) => a + (inv.balance ?? 0), 0);
  const totalPaid = invoices.reduce((a, inv) => a + (inv.paidAmount ?? 0), 0);
  const primaryContact = customer.contacts?.find((c) => c.isPrimary) ?? customer.contacts?.[0];
  const primaryAddress = customer.addresses?.find((a) => a.isDefault) ?? customer.addresses?.[0];

  const mapHref =
    primaryAddress?.latitude && primaryAddress?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${primaryAddress.latitude},${primaryAddress.longitude}`
      : null;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/customers" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All customers
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Avatar className="size-10">
              <AvatarFallback className="bg-[var(--color-brand-muted)] text-[var(--color-brand)]">
                {initials(customer.commercialName)}
              </AvatarFallback>
            </Avatar>
            <span>
              <span className="block text-[17px] leading-tight">{customer.commercialName}</span>
              <span className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{customer.code}</span>
                <Badge variant="outline">{CUSTOMER_TYPE_LABELS[customer.type as CustomerType]}</Badge>
                <CustomerStatusBadge status={customer.status as CustomerStatus} />
              </span>
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/customers/${id}/edit`}>Edit</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/sales/quotations/new?customerId=${id}`}>+ New quotation</Link>
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Units"
          value={units.length}
          hint={`${units.filter((u) => u.currentStatus === "operational").length} operational`}
          icon={<Building2 className="size-4" />}
          accent="info"
        />
        <KpiCard
          label="Active contracts"
          value={contracts.filter((c) => c.status === "active" || c.status === "expiring_soon").length}
          hint={`${contracts.length} total`}
          icon={<FileSignature className="size-4" />}
          accent="success"
        />
        <KpiCard
          label="Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={<Receipt className="size-4" />}
          accent={totalOutstanding > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Lifetime paid"
          value={formatCurrency(totalPaid)}
          icon={<Receipt className="size-4" />}
          accent="default"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <Field label="Commercial name">{customer.commercialName}</Field>
            <Field label="Legal name">{customer.legalName || "—"}</Field>
            <Field label="Tax number">
              <span className="font-mono">{customer.taxNumber || "—"}</span>
            </Field>
            <Field label="Commercial registration">
              <span className="font-mono">{customer.commercialRegistration || "—"}</span>
            </Field>
            <Field label="Risk rating">
              <Badge variant={customer.riskRating === "A" ? "success" : customer.riskRating === "D" ? "danger" : "outline"}>
                Risk {customer.riskRating}
              </Badge>
            </Field>
            <Field label="Credit limit">{formatCurrency(customer.creditLimit ?? 0)}</Field>
            <Field label="Activated at">
              {customer.activatedAt ? formatDate(customer.activatedAt) : <span className="text-[var(--color-text-muted)]">Not activated</span>}
            </Field>
            <Field label="Sales rep">
              {(() => {
                const sr = customer.assignedSalesRepId as unknown as { firstName?: string; lastName?: string } | null;
                return sr ? `${sr.firstName} ${sr.lastName}` : "—";
              })()}
            </Field>
            <Field label="Collection officer">
              {(() => {
                const co = customer.assignedCollectionOfficerId as unknown as { firstName?: string; lastName?: string } | null;
                return co ? `${co.firstName} ${co.lastName}` : "—";
              })()}
            </Field>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Primary contact</CardTitle>
            <CardDescription>Who to reach at this account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {primaryContact ? (
              <>
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {primaryContact.name}
                </div>
                {primaryContact.role && (
                  <div className="text-[11px] text-[var(--color-text-muted)]">{primaryContact.role}</div>
                )}
                {primaryContact.phone && (
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Phone className="size-3" /> {primaryContact.phone}
                  </a>
                )}
                {primaryContact.email && (
                  <a
                    href={`mailto:${primaryContact.email}`}
                    className="flex items-center gap-2 break-all text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <Mail className="size-3" /> {primaryContact.email}
                  </a>
                )}
                {customer.contacts && customer.contacts.length > 1 && (
                  <div className="pt-2 text-[10px] text-[var(--color-text-muted)]">
                    + {customer.contacts.length - 1} other contact{customer.contacts.length > 2 ? "s" : ""}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[var(--color-text-muted)]">No contacts recorded.</div>
            )}
          </CardContent>
        </Card>

        {/* Address & location */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Primary location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {primaryAddress ? (
              <>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3 text-[var(--color-text-muted)]" />
                  <div>
                    <div>{primaryAddress.street}</div>
                    <div className="text-[var(--color-text-muted)]">
                      {primaryAddress.district}, {primaryAddress.city}, {primaryAddress.country}
                    </div>
                  </div>
                </div>
                {mapHref && (
                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <a href={mapHref} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> Open in Google Maps
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <div className="text-[var(--color-text-muted)]">No address on file.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="units">
            <TabsList>
              <TabsTrigger value="units">Units ({units.length})</TabsTrigger>
              <TabsTrigger value="contracts">Contracts ({contracts.length})</TabsTrigger>
              <TabsTrigger value="visits">Visits ({workOrders.length})</TabsTrigger>
              <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="units">
              <SimpleTable
                data={units}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/units/${String((row as { _id: unknown })._id)}`}
                columns={[
                  {
                    key: "code",
                    header: "Code",
                    accessor: (row) => (
                      <span className="font-mono text-[11px]">{(row as { code: string }).code}</span>
                    ),
                  },
                  {
                    key: "model",
                    header: "Model",
                    accessor: (row) => <span className="text-xs">{(row as { model: string }).model}</span>,
                  },
                  {
                    key: "type",
                    header: "Type",
                    accessor: (row) => (
                      <Badge variant="outline">{String((row as { type: string }).type).replace("_", " ")}</Badge>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    accessor: (row) => <UnitStatusDot status={(row as { currentStatus: UnitStatus }).currentStatus} />,
                  },
                  {
                    key: "lastService",
                    header: "Last service",
                    accessor: (row) => {
                      const u = row as { lastServiceAt?: Date };
                      return u.lastServiceAt ? (
                        <span className="text-[11px]">{formatDate(u.lastServiceAt)}</span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
                      );
                    },
                  },
                ]}
                emptyTitle="No units"
                emptyDescription="Install or import units for this customer to get started."
              />
            </TabsContent>

            <TabsContent value="contracts">
              <SimpleTable
                data={contracts}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/contracts/${String((row as { _id: unknown })._id)}`}
                columns={[
                  {
                    key: "code",
                    header: "Code",
                    accessor: (row) => (
                      <span className="font-mono text-[11px]">{(row as { code: string }).code}</span>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    accessor: (row) => (
                      <Badge variant="outline">
                        {String((row as { type: string }).type).replace(/_/g, " ")}
                      </Badge>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    accessor: (row) => {
                      const status = (row as { status: string }).status;
                      return (
                        <Badge
                          variant={
                            status === "active"
                              ? "success"
                              : status === "expiring_soon"
                                ? "warning"
                                : status === "expired"
                                  ? "danger"
                                  : "outline"
                          }
                        >
                          {status.replace("_", " ")}
                        </Badge>
                      );
                    },
                  },
                  {
                    key: "period",
                    header: "Period",
                    accessor: (row) => {
                      const c = row as { startDate: Date; endDate: Date };
                      return (
                        <span className="text-[11px]">
                          {formatDate(c.startDate)} → {formatDate(c.endDate)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "total",
                    header: "Total",
                    align: "right",
                    accessor: (row) => (
                      <span className="font-mono text-xs">
                        {formatCurrency((row as { total: number }).total)}
                      </span>
                    ),
                  },
                ]}
                emptyTitle="No contracts"
              />
            </TabsContent>

            <TabsContent value="visits">
              <SimpleTable
                data={workOrders}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/service/work-orders/${String((row as { _id: unknown })._id)}`}
                columns={[
                  {
                    key: "code",
                    header: "Code",
                    accessor: (row) => <span className="font-mono text-[11px]">{(row as { code: string }).code}</span>,
                  },
                  {
                    key: "date",
                    header: "Date",
                    accessor: (row) => (
                      <span className="text-[11px]">
                        {formatDate((row as { scheduledDate: Date }).scheduledDate)}{" "}
                        <span className="text-[var(--color-text-muted)]">
                          {(row as { scheduledTime: string }).scheduledTime}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    accessor: (row) => (
                      <Badge variant="outline">{String((row as { type: string }).type).replace("_", " ")}</Badge>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    accessor: (row) => <WorkOrderStatusBadge status={(row as { status: WorkOrderStatus }).status} />,
                  },
                  {
                    key: "tech",
                    header: "Technician",
                    accessor: (row) => {
                      const t = (row as { technicianId: { firstName?: string; lastName?: string } | null }).technicianId;
                      return <span className="text-xs">{t ? `${t.firstName} ${t.lastName}` : "—"}</span>;
                    },
                  },
                  {
                    key: "rating",
                    header: "Rating",
                    accessor: (row) => {
                      const fb = (row as { customerFeedback?: { rating?: number } | null }).customerFeedback;
                      return fb?.rating ? (
                        <span className="text-xs">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                      ) : (
                        <span className="text-[11px] text-[var(--color-text-muted)]">—</span>
                      );
                    },
                  },
                ]}
                emptyTitle="No visits yet"
              />
            </TabsContent>

            <TabsContent value="invoices">
              <SimpleTable
                data={invoices}
                getKey={(row) => String((row as { _id: unknown })._id)}
                rowHref={(row) => `/finance/invoices/${String((row as { _id: unknown })._id)}`}
                columns={[
                  {
                    key: "code",
                    header: "Code",
                    accessor: (row) => <span className="font-mono text-[11px]">{(row as { code: string }).code}</span>,
                  },
                  {
                    key: "issued",
                    header: "Issued",
                    accessor: (row) => <span className="text-[11px]">{formatDate((row as { issueDate: Date }).issueDate)}</span>,
                  },
                  {
                    key: "due",
                    header: "Due",
                    accessor: (row) => <span className="text-[11px]">{formatDate((row as { dueDate: Date }).dueDate)}</span>,
                  },
                  {
                    key: "total",
                    header: "Total",
                    align: "right",
                    accessor: (row) => <span className="font-mono text-xs">{formatCurrency((row as { total: number }).total)}</span>,
                  },
                  {
                    key: "balance",
                    header: "Balance",
                    align: "right",
                    accessor: (row) => {
                      const b = (row as { balance: number }).balance;
                      return (
                        <span className={`font-mono text-xs ${b > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>
                          {formatCurrency(b)}
                        </span>
                      );
                    },
                  },
                  {
                    key: "status",
                    header: "Status",
                    accessor: (row) => <InvoiceStatusBadge status={(row as { status: InvoiceStatus }).status} />,
                  },
                ]}
                emptyTitle="No invoices"
              />
            </TabsContent>

            <TabsContent value="notes">
              {notes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
                  No notes yet for this customer.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div
                      key={String(n._id)}
                      className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-3"
                    >
                      <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
                        <span>{formatDateTime(n.createdAt ?? new Date())}</span>
                        <Badge variant="outline">{n.visibility}</Badge>
                      </div>
                      {n.title && <div className="text-xs font-medium">{n.title}</div>}
                      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-[var(--color-text-primary)]">{children}</span>
    </div>
  );
}
