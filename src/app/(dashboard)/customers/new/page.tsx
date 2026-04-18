import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { createCustomer } from "@/server/customers/actions";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, MAKKAH_DISTRICTS } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireSession();

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/customers" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All customers
        </Link>
      </div>

      <PageHeader
        title="New customer"
        description="Create a new lead. Status will be Lead until a quotation is accepted."
      />

      <form action={createCustomer} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
            <CardDescription>Basic information about the customer</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="commercialName" label="Commercial name *" required />
            <Field id="legalName" label="Legal name" />
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select
                name="type"
                id="type"
                required
                className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm"
                defaultValue="company"
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CUSTOMER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leadSource">Lead source</Label>
              <select
                name="leadSource"
                id="leadSource"
                className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm"
                defaultValue="referral"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_call">Cold call</option>
                <option value="walk_in">Walk-in</option>
                <option value="marketing_campaign">Marketing campaign</option>
                <option value="existing_customer">Existing customer</option>
                <option value="partner">Partner</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Field id="taxNumber" label="Tax number (VAT)" />
            <Field id="commercialRegistration" label="CR number" />
            <Field id="creditLimit" label="Credit limit (SAR)" type="number" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="contactName" label="Contact name *" required />
            <Field id="contactRole" label="Role" />
            <Field id="contactPhone" label="Phone *" required placeholder="+9665..." />
            <Field id="contactEmail" label="Email" type="email" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="street">Street address</Label>
              <Input id="street" name="street" placeholder="Building, street, neighborhood details" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <select
                name="district"
                id="district"
                className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm"
              >
                <option value="">— Select district —</option>
                {MAKKAH_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild>
            <Link href="/customers">Cancel</Link>
          </Button>
          <Button type="submit">Create customer</Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} placeholder={placeholder} />
    </div>
  );
}
