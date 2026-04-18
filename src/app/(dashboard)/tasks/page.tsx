import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { SimpleTable } from "@/components/data-table/simple-table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Task, User } from "@/models";
import { scopedFilter } from "@/server/filters";
import { CheckSquare, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string; priority?: string; open?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter = scopedFilter(session, { deletedAt: null });
  if (sp.status) {
    filter.status = sp.status;
  } else if (sp.open === "true" || sp.view === "open") {
    filter.status = { $in: ["todo", "in_progress", "pending_review"] };
  }
  if (sp.priority) filter.priority = sp.priority;
  if (sp.view === "mine") filter.assigneeIds = session.user.id;
  if (sp.view === "assigned") filter.assignerId = session.user.id;
  if (sp.view === "overdue") {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $in: ["todo", "in_progress"] };
  }

  const [tasks, stats, overdueCount] = await Promise.all([
    Task.find(filter)
      .sort({ dueDate: 1 })
      .limit(200)
      .populate("assignerId", "firstName lastName")
      .populate("assigneeIds", "firstName lastName")
      .lean(),
    Task.aggregate([
      { $match: scopedFilter(session, { deletedAt: null }) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.countDocuments(
      scopedFilter(session, {
        dueDate: { $lt: new Date() },
        status: { $in: ["todo", "in_progress"] },
        deletedAt: null,
      }),
    ),
  ]);

  const statMap = new Map(stats.map((s) => [s._id, s.count]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Work items assigned across your team and projects"
        actions={
          <Button asChild>
            <Link href="/tasks/new">+ New task</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="To do" value={statMap.get("todo") ?? 0} icon={<CheckSquare className="size-4" />} accent="info" />
        <KpiCard label="In progress" value={statMap.get("in_progress") ?? 0} icon={<Clock className="size-4" />} accent="warning" />
        <KpiCard label="Overdue" value={overdueCount} icon={<AlertCircle className="size-4" />} accent={overdueCount > 0 ? "danger" : "default"} />
        <KpiCard label="Done" value={statMap.get("done") ?? 0} icon={<CheckCircle2 className="size-4" />} accent="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks"
          className={`rounded-md border px-2.5 py-1 text-[11px] ${!sp.view ? "border-[var(--color-brand)] bg-[var(--color-brand-muted)]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"}`}
        >
          All
        </Link>
        <Link
          href="/tasks?view=mine"
          className={`rounded-md border px-2.5 py-1 text-[11px] ${sp.view === "mine" ? "border-[var(--color-brand)] bg-[var(--color-brand-muted)]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"}`}
        >
          My tasks
        </Link>
        <Link
          href="/tasks?view=assigned"
          className={`rounded-md border px-2.5 py-1 text-[11px] ${sp.view === "assigned" ? "border-[var(--color-brand)] bg-[var(--color-brand-muted)]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"}`}
        >
          Assigned by me
        </Link>
        <Link
          href="/tasks?view=overdue"
          className={`rounded-md border px-2.5 py-1 text-[11px] ${sp.view === "overdue" ? "border-[var(--color-danger)] bg-[rgba(239,68,68,0.1)] text-[var(--color-danger)]" : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"}`}
        >
          Overdue ({overdueCount})
        </Link>
      </div>

      <SimpleTable
        data={tasks}
        getKey={(row) => String((row as { _id: unknown })._id)}
        rowHref={(row) => `/tasks/${String((row as { _id: unknown })._id)}`}
        columns={[
          {
            key: "title",
            header: "Title",
            accessor: (row) => {
              const t = row as { title: string; description?: string };
              return (
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 line-clamp-1 text-[10px] text-[var(--color-text-muted)]">
                      {t.description}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "priority",
            header: "Priority",
            accessor: (row) => {
              const p = (row as { priority: string }).priority;
              return (
                <Badge
                  variant={p === "urgent" ? "danger" : p === "high" ? "warning" : p === "low" ? "outline" : "info"}
                >
                  {p}
                </Badge>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            accessor: (row) => {
              const s = (row as { status: string }).status;
              return (
                <Badge
                  variant={
                    s === "done"
                      ? "success"
                      : s === "in_progress"
                        ? "warning"
                        : s === "blocked"
                          ? "danger"
                          : s === "pending_review"
                            ? "info"
                            : "outline"
                  }
                >
                  {s.replace("_", " ")}
                </Badge>
              );
            },
          },
          {
            key: "assignees",
            header: "Assignees",
            accessor: (row) => {
              const as = (row as { assigneeIds?: Array<{ firstName?: string; lastName?: string }> }).assigneeIds ?? [];
              if (!as.length) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              return (
                <div className="flex -space-x-1">
                  {as.slice(0, 3).map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex size-5 items-center justify-center rounded-full border border-[var(--color-bg-surface)] bg-[var(--color-brand-muted)] text-[9px] font-medium text-[var(--color-brand)]"
                      title={`${a.firstName} ${a.lastName}`}
                    >
                      {(a.firstName?.[0] ?? "") + (a.lastName?.[0] ?? "")}
                    </span>
                  ))}
                  {as.length > 3 && (
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-[var(--color-bg-surface)] bg-[var(--color-bg-elevated)] text-[9px]">
                      +{as.length - 3}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: "due",
            header: "Due",
            accessor: (row) => {
              const t = row as { dueDate?: Date; status: string };
              if (!t.dueDate) return <span className="text-[11px] text-[var(--color-text-muted)]">—</span>;
              const days = Math.floor((new Date(t.dueDate).getTime() - Date.now()) / 86_400_000);
              const isOverdue = days < 0 && !["done", "cancelled"].includes(t.status);
              return (
                <span
                  className={`text-[11px] ${isOverdue ? "text-[var(--color-danger)]" : days < 2 ? "text-[var(--color-warning)]" : "text-[var(--color-text-secondary)]"}`}
                >
                  {formatDate(t.dueDate)}
                  {isOverdue && <span className="ml-1 font-mono">({-days}d over)</span>}
                </span>
              );
            },
          },
        ]}
        emptyTitle="No tasks"
      />
    </div>
  );
}
