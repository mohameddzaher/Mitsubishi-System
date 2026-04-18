import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models";
import { scopedFilter } from "@/server/filters";
import { createUnit } from "@/server/units/actions";
import { MITSUBISHI_MODELS } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function NewUnitPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();
  const customers = await Customer.find(scopedFilter(session, { deletedAt: null, status: "active" }))
    .select("commercialName code")
    .sort({ commercialName: 1 })
    .lean();

  const options = customers.map((c) => ({
    value: String(c._id),
    label: c.commercialName,
    description: c.code,
  }));

  return (
    <div className="space-y-5">
      <div className="text-xs"><Link href="/units" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">← All units</Link></div>
      <PageHeader title="New unit" description="Register an elevator, escalator, or moving walk under MELSA service." />

      <form action={createUnit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Unit details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customerId">Customer *</Label>
              <SearchableSelect
                name="customerId"
                options={options}
                defaultValue={sp.customerId ?? ""}
                placeholder="Select customer…"
                searchPlaceholder="Search by name or code"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model *</Label>
              <select id="model" name="model" aria-label="Model" title="Model" required className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {MITSUBISHI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select id="type" name="type" aria-label="Type" title="Type" required className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                <option value="passenger">Passenger</option>
                <option value="freight">Freight</option>
                <option value="hospital">Hospital</option>
                <option value="observation">Observation</option>
                <option value="service">Service</option>
                <option value="home">Home</option>
                <option value="escalator">Escalator</option>
                <option value="moving_walk">Moving walk</option>
              </select>
            </div>
            <Field id="serialNumber" label="Serial number" />
            <Field id="capacity" label="Capacity (kg) *" type="number" required />
            <Field id="speed" label="Speed (m/s) *" type="number" required />
            <Field id="floorsServed" label="Floors served *" type="number" required />
            <Field id="travelDistance" label="Travel distance (m)" type="number" />
            <Field id="building" label="Building / location note" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href="/units">Cancel</Link></Button>
          <Button type="submit">Create unit</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, type = "text", required }: { id: string; label: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} step={type === "number" ? "any" : undefined} />
    </div>
  );
}
