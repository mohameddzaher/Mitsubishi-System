import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge, WorkOrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { WorkOrder } from "@/models";
import { formatDate } from "@/lib/utils";
import { CalendarCheck, MapPin, Phone, Clock, ExternalLink, Wrench } from "lucide-react";
import Link from "next/link";
import type { Priority, WorkOrderStatus } from "@/config/constants";

export const dynamic = "force-dynamic";

export default async function MyDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const target = sp.date ? new Date(sp.date) : new Date();
  target.setHours(0, 0, 0, 0);
  const dayAfter = new Date(target);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const upcomingLimit = new Date(target);
  upcomingLimit.setDate(upcomingLimit.getDate() + 14);

  const [visits, upcoming] = await Promise.all([
    WorkOrder.find({
      technicianId: session.user.id,
      scheduledDate: { $gte: target, $lt: dayAfter },
      deletedAt: null,
    })
      .sort({ scheduledTime: 1 })
      .populate("customerId", "commercialName code contacts addresses")
      .populate("unitId", "code model type location")
      .populate("contractId", "code type")
      .lean(),
    WorkOrder.find({
      technicianId: session.user.id,
      scheduledDate: { $gte: dayAfter, $lt: upcomingLimit },
      status: { $in: ["scheduled", "assigned"] },
      deletedAt: null,
    })
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(10)
      .populate("customerId", "commercialName")
      .populate("unitId", "model code")
      .lean(),
  ]);

  const prevDay = new Date(target);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(target);
  nextDay.setDate(nextDay.getDate() + 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-baseline gap-2">
            <span>My Day</span>
            <span className="text-xs font-normal text-[var(--color-text-muted)]">
              {formatDate(target)}
            </span>
          </span>
        }
        description={`${visits.length} visit${visits.length === 1 ? "" : "s"} scheduled`}
        actions={
          <div className="flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/service/my-day?date=${prevDay.toISOString().split("T")[0]}`}>←</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/service/my-day">Today</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/service/my-day?date=${nextDay.toISOString().split("T")[0]}`}>→</Link>
            </Button>
          </div>
        }
      />

      {visits.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="size-4" />}
          title="No visits scheduled for this day"
          description={
            upcoming.length > 0
              ? `You have ${upcoming.length} upcoming visit${upcoming.length === 1 ? "" : "s"} in the next 14 days — see below.`
              : "Enjoy your day off, or check with dispatch for emergency calls."
          }
        />
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const c = visit.customerId as unknown as {
              commercialName?: string;
              code?: string;
              contacts?: Array<{ name?: string; phone?: string; isPrimary?: boolean }>;
              addresses?: Array<{ street?: string; district?: string; latitude?: number; longitude?: number }>;
            } | null;
            const u = visit.unitId as unknown as { code?: string; model?: string; type?: string; location?: { building?: string; floor?: string } } | null;
            const contact = c?.contacts?.find((ct) => ct.isPrimary) ?? c?.contacts?.[0];
            const addr = c?.addresses?.[0];
            const mapHref =
              addr?.latitude && addr?.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`
                : null;

            return (
              <Card key={String(visit._id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-11 flex-col items-center justify-center rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] text-center">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">at</span>
                          <span className="text-xs font-bold">{visit.scheduledTime}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/service/work-orders/${String(visit._id)}`}
                              className="truncate text-[15px] font-semibold hover:text-[var(--color-brand)]"
                            >
                              {c?.commercialName ?? "Unknown customer"}
                            </Link>
                            <PriorityBadge priority={visit.priority as Priority} />
                            <WorkOrderStatusBadge status={visit.status as WorkOrderStatus} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                            <span className="font-mono">{visit.code}</span>
                            <span>·</span>
                            <Badge variant="outline">{String(visit.type).replace("_", " ")}</Badge>
                            <span>·</span>
                            <span>
                              Expected {visit.expectedDurationMinutes}min
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-start gap-2 text-xs">
                          <Wrench className="mt-0.5 size-3 shrink-0 text-[var(--color-text-muted)]" />
                          <div>
                            <div>{u?.model ?? "—"}</div>
                            <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{u?.code}</div>
                          </div>
                        </div>
                        {addr && (
                          <div className="flex items-start gap-2 text-xs">
                            <MapPin className="mt-0.5 size-3 shrink-0 text-[var(--color-text-muted)]" />
                            <div>
                              <div>{addr.street}</div>
                              <div className="text-[var(--color-text-muted)]">{addr.district}, Makkah</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {contact && (
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--color-text-secondary)]">
                          <span>{contact.name}</span>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)]">
                              <Phone className="size-3" /> {contact.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-1.5">
                      {mapHref && (
                        <Button variant="secondary" size="sm" asChild>
                          <a href={mapHref} target="_blank" rel="noopener noreferrer">
                            <ExternalLink /> Maps
                          </a>
                        </Button>
                      )}
                      <Button size="sm" asChild>
                        <Link href={`/service/work-orders/${String(visit._id)}`}>
                          <Clock /> {visit.status === "in_progress" ? "Continue" : visit.status === "completed" ? "View" : "Start"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Upcoming</h2>
            <span className="text-[10px] text-[var(--color-text-muted)]">Next 14 days</span>
          </div>
          <div className="space-y-1.5">
            {upcoming.map((v) => {
              const c = v.customerId as unknown as { commercialName?: string } | null;
              const u = v.unitId as unknown as { code?: string; model?: string } | null;
              return (
                <Link
                  key={String(v._id)}
                  href={`/service/work-orders/${String(v._id)}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-xs hover:border-[var(--color-border-default)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex w-[68px] flex-col rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {new Date(v.scheduledDate).toLocaleDateString("en-GB", { weekday: "short" })}
                      </span>
                      <span className="text-[11px] font-semibold">
                        {formatDate(v.scheduledDate)}
                      </span>
                      <span className="text-[9.5px] font-mono text-[var(--color-text-muted)]">{v.scheduledTime}</span>
                    </span>
                    <div>
                      <div className="font-medium">{c?.commercialName ?? "—"}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <span className="font-mono">{v.code}</span>
                        <span>·</span>
                        <span>{u?.model ?? ""}</span>
                        <PriorityBadge priority={v.priority as Priority} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--color-brand)]">Open →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
