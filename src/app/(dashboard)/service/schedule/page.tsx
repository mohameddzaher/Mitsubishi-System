import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User, WorkOrder } from "@/models";
import { scopedFilter } from "@/server/filters";
import { UserRole } from "@/config/roles";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MonthlyPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const now = new Date();
  const year = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = sp.month ? parseInt(sp.month, 10) - 1 : now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const [techs, woList] = await Promise.all([
    User.find({
      role: {
        $in: [UserRole.SERVICE_TECHNICIAN, UserRole.SENIOR_TECHNICIAN, UserRole.APPRENTICE_TECHNICIAN],
      },
      status: "active",
      deletedAt: null,
    })
      .sort({ firstName: 1 })
      .lean(),
    WorkOrder.find(
      scopedFilter(session, {
        scheduledDate: { $gte: monthStart, $lt: monthEnd },
        deletedAt: null,
      }),
    )
      .populate("customerId", "commercialName")
      .lean(),
  ]);

  // Bucket by tech + day
  const grid = new Map<string, Array<(typeof woList)[number]>>();
  for (const wo of woList) {
    const day = new Date(wo.scheduledDate).getDate();
    const key = `${String(wo.technicianId)}-${day}`;
    const list = grid.get(key) ?? [];
    list.push(wo);
    grid.set(key, list);
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly planner"
        description={monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/service/schedule?month=${prevMonth.getMonth() + 1}&year=${prevMonth.getFullYear()}`}>←</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/service/schedule">This month</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/service/schedule?month=${nextMonth.getMonth() + 1}&year=${nextMonth.getFullYear()}`}>→</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--color-bg-surface)] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Technician
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = new Date(year, month, i + 1);
                    const isWeekend = d.getDay() === 5 || d.getDay() === 6;
                    return (
                      <th
                        key={i}
                        className={cn(
                          "border-b border-[var(--color-border-subtle)] px-1 py-2 text-center text-[10px]",
                          isWeekend ? "bg-[var(--color-bg-elevated)]/40" : "",
                        )}
                      >
                        <div className="font-semibold text-[var(--color-text-secondary)]">{i + 1}</div>
                        <div className="text-[9px] text-[var(--color-text-muted)]">
                          {d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {techs.map((tech) => (
                  <tr key={String(tech._id)}>
                    <td className="sticky left-0 z-10 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2 py-1.5">
                      <Link href={`/service/work-orders?tech=${String(tech._id)}`} className="block">
                        <div className="text-[11px] font-medium">
                          {tech.firstName} {tech.lastName}
                        </div>
                        <div className="text-[9px] text-[var(--color-text-muted)]">{tech.employeeId}</div>
                      </Link>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const visits = grid.get(`${String(tech._id)}-${i + 1}`) ?? [];
                      return (
                        <td
                          key={i}
                          className="border-b border-[var(--color-border-subtle)] p-0.5 align-top"
                        >
                          <div className="flex flex-col gap-0.5">
                            {visits.slice(0, 3).map((v) => (
                              <Link
                                key={String(v._id)}
                                href={`/service/work-orders/${String(v._id)}`}
                                className={cn(
                                  "block truncate rounded-sm px-1 py-0.5 text-[8.5px]",
                                  v.priority === "critical"
                                    ? "bg-[rgba(239,68,68,0.2)] text-[var(--color-danger)]"
                                    : v.priority === "high"
                                      ? "bg-[rgba(245,158,11,0.2)] text-[var(--color-warning)]"
                                      : v.status === "completed"
                                        ? "bg-[rgba(16,185,129,0.15)] text-[var(--color-success)]"
                                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
                                )}
                                title={`${v.scheduledTime} — ${(v.customerId as unknown as { commercialName?: string } | null)?.commercialName ?? ""}`}
                              >
                                <span className="font-mono">{v.scheduledTime}</span>
                              </Link>
                            ))}
                            {visits.length > 3 && (
                              <span className="px-1 text-[8.5px] text-[var(--color-text-muted)]">
                                +{visits.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[var(--color-bg-elevated)]" /> Scheduled
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[rgba(16,185,129,0.15)]" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[rgba(245,158,11,0.2)]" /> High priority
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-[rgba(239,68,68,0.2)]" /> Critical
        </span>
      </div>
    </div>
  );
}
