import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Unit } from "@/models";
import { MITSUBISHI_MODELS } from "@/config/constants";
import { updateUnit } from "@/server/units/edit-actions";

export const dynamic = "force-dynamic";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  await connectDB();

  let unit;
  try {
    unit = await Unit.findById(id).lean();
  } catch {
    notFound();
  }
  if (!unit) notFound();

  const updateWithId = updateUnit.bind(null, id);

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href={`/units/${id}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← Back to unit
        </Link>
      </div>
      <PageHeader title={`Edit ${unit.model}`} description={unit.code} />

      <form action={updateWithId} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Unit details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <select id="model" name="model" required defaultValue={unit.model} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {MITSUBISHI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" required defaultValue={unit.type} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {["passenger", "freight", "hospital", "observation", "service", "home", "escalator", "moving_walk"].map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentStatus">Operational status</Label>
              <select id="currentStatus" name="currentStatus" required defaultValue={unit.currentStatus} className="h-10 w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm">
                {["operational", "under_maintenance", "breakdown", "modernization", "decommissioned"].map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <Field id="serialNumber" label="Serial number" defaultValue={unit.serialNumber ?? ""} />
            <Field id="capacity" label="Capacity (kg)" type="number" required defaultValue={String(unit.capacity)} />
            <Field id="speed" label="Speed (m/s)" type="number" step="0.1" required defaultValue={String(unit.speed)} />
            <Field id="floorsServed" label="Floors served" type="number" required defaultValue={String(unit.floorsServed)} />
            <Field id="building" label="Building note" defaultValue={unit.location?.building ?? ""} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" asChild><Link href={`/units/${id}`}>Cancel</Link></Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, type = "text", required, step, defaultValue }: { id: string; label: string; type?: string; required?: boolean; step?: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} step={step} defaultValue={defaultValue} />
    </div>
  );
}
