import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Customer, Unit } from "@/models";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnitStatusDot } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalUnitsPage() {
  const session = await requireSession();
  await connectDB();
  const customer = session.user.employeeId ? await Customer.findOne({ code: session.user.employeeId }).lean() : null;
  if (!customer) {
    return <EmptyState icon={<Building2 className="size-4" />} title="No customer linked" />;
  }

  const units = await Unit.find({ customerId: customer._id, deletedAt: null })
    .populate("activeContractId", "code type")
    .lean();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold">My units</h1>
        <p className="text-xs text-[var(--color-text-muted)]">
          {units.length} elevator{units.length === 1 ? "" : "s"} & escalator{units.length === 1 ? "" : "s"} under MELSA service
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((u) => (
          <Card key={String(u._id)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold">{u.model}</div>
                  <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u.code}</div>
                </div>
                <Badge variant="outline">{String(u.type).replace("_", " ")}</Badge>
              </div>
              <div className="mt-3">
                <UnitStatusDot status={u.currentStatus as "operational" | "under_maintenance" | "breakdown" | "decommissioned" | "modernization"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-3 text-[11px]">
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Capacity</div>
                  <div>{u.capacity} kg</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Floors</div>
                  <div>{u.floorsServed}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Last service</div>
                  <div>{u.lastServiceAt ? formatDate(u.lastServiceAt) : "—"}</div>
                </div>
                <div>
                  <div className="text-[9.5px] uppercase text-[var(--color-text-muted)]">Next service</div>
                  <div>{u.nextServiceDue ? formatDate(u.nextServiceDue) : "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {units.length === 0 && (
        <EmptyState
          icon={<Building2 className="size-4" />}
          title="No units recorded"
          description="Your MELSA account manager will configure your units shortly."
        />
      )}
    </div>
  );
}
