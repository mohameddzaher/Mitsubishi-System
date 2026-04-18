import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS, MAKKAH_DISTRICTS } from "@/config/constants";
import { updateCustomer, softDeleteCustomer } from "@/server/customers/edit-actions";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let customer;
  try {
    customer = await Customer.findById(id).lean();
  } catch {
    notFound();
  }
  if (!customer) notFound();

  const primary = customer.contacts?.find((c) => c.isPrimary) ?? customer.contacts?.[0];
  const addr = customer.addresses?.find((a) => a.isDefault) ?? customer.addresses?.[0];

  const updateWithId = updateCustomer.bind(null, id);

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href={`/customers/${id}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← Back to customer
        </Link>
      </div>

      <PageHeader title={`Edit ${customer.commercialName}`} description={`${customer.code} · Update account information`} />

      <form action={updateWithId} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Company</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="commercialName" label="Commercial name *" required defaultValue={customer.commercialName} />
            <Field id="legalName" label="Legal name" defaultValue={customer.legalName ?? ""} />
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select id="type" name="type" required defaultValue={customer.type} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status *</Label>
              <select id="status" name="status" required defaultValue={customer.status} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {CUSTOMER_STATUSES.map((s) => (
                  <option key={s} value={s}>{CUSTOMER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <Field id="taxNumber" label="Tax number" defaultValue={customer.taxNumber ?? ""} />
            <Field id="commercialRegistration" label="CR number" defaultValue={customer.commercialRegistration ?? ""} />
            <Field id="creditLimit" label="Credit limit (SAR)" type="number" defaultValue={String(customer.creditLimit ?? 0)} />
            <div className="space-y-1.5">
              <Label htmlFor="riskRating">Risk rating</Label>
              <select id="riskRating" name="riskRating" defaultValue={customer.riskRating ?? "B"} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {["A", "B", "C", "D"].map((r) => <option key={r} value={r}>Risk {r}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Primary contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="contactName" label="Name" defaultValue={primary?.name ?? ""} />
            <Field id="contactRole" label="Role" defaultValue={primary?.role ?? ""} />
            <Field id="contactPhone" label="Phone" defaultValue={primary?.phone ?? ""} />
            <Field id="contactEmail" label="Email" type="email" defaultValue={primary?.email ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="street">Street address</Label>
              <Input id="street" name="street" defaultValue={addr?.street ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <select id="district" name="district" defaultValue={addr?.district ?? ""} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="">—</option>
                {MAKKAH_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Internal notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="notes" defaultValue={customer.notes ?? ""} placeholder="Not visible to the customer" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <DeleteButton customerId={id} />
          <div className="flex items-center gap-2">
            <Button variant="secondary" asChild><Link href={`/customers/${id}`}>Cancel</Link></Button>
            <Button type="submit">Save changes</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, type = "text", required, defaultValue }: { id: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} defaultValue={defaultValue} />
    </div>
  );
}

function DeleteButton({ customerId }: { customerId: string }) {
  const action = softDeleteCustomer.bind(null, customerId);
  return (
    <form action={async () => { "use server"; await action(); }}>
      <Button type="submit" variant="danger" size="sm">Delete customer</Button>
    </form>
  );
}
