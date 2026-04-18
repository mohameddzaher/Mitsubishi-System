import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Task } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatDateTime, initials, relativeTime } from "@/lib/utils";
import { CheckSquare, User as UserIcon, Calendar, MessageSquare, Paperclip, Clock } from "lucide-react";
import { TaskStatusActions } from "./task-status-actions";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  await connectDB();

  let task;
  try {
    task = await Task.findById(id)
      .populate("assignerId", "firstName lastName")
      .populate("assigneeIds", "firstName lastName email")
      .populate("comments.userId", "firstName lastName")
      .populate("completedById", "firstName lastName")
      .lean();
  } catch {
    notFound();
  }
  if (!task) notFound();

  const assigner = task.assignerId as unknown as { _id?: unknown; firstName?: string; lastName?: string } | null;
  const assignees = (task.assigneeIds as unknown as Array<{ _id: unknown; firstName?: string; lastName?: string; email?: string }>) ?? [];

  const isAssignee = assignees.some((a) => String(a._id) === session.user.id);
  const isAssigner = String(assigner?._id) === session.user.id;
  const canAct = isAssignee || isAssigner;

  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="text-xs">
        <Link href="/tasks" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          ← All tasks
        </Link>
      </div>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <CheckSquare className="size-4 text-[var(--color-brand)]" />
            <span>{task.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={task.priority === "urgent" ? "danger" : task.priority === "high" ? "warning" : task.priority === "low" ? "outline" : "info"}>
              {task.priority}
            </Badge>
            <Badge
              variant={
                task.status === "done"
                  ? "success"
                  : task.status === "in_progress"
                    ? "warning"
                    : task.status === "blocked"
                      ? "danger"
                      : "outline"
              }
            >
              {String(task.status).replace("_", " ")}
            </Badge>
            {task.dueDate && (
              <span className="text-[var(--color-text-muted)]">· Due {formatDate(task.dueDate)}</span>
            )}
          </span>
        }
        actions={canAct && task.status !== "done" && task.status !== "cancelled" ? <TaskStatusActions taskId={id} status={task.status} /> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            {task.description ? (
              <p className="whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{task.description}</p>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No description provided.</p>
            )}

            {subtaskCount > 0 && (
              <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span>Subtasks</span>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                    {subtaskDone}/{subtaskCount}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {task.subtasks?.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2 text-xs"
                    >
                      <input type="checkbox" checked={st.completed} readOnly className="size-3.5 accent-[var(--color-success)]" />
                      <span className={st.completed ? "text-[var(--color-text-muted)] line-through" : ""}>{st.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-[10px] uppercase text-[var(--color-text-muted)]">Assigned to</div>
              <div className="flex flex-wrap gap-1.5">
                {assignees.length === 0 && <span className="text-[var(--color-text-muted)]">Unassigned</span>}
                {assignees.map((a) => (
                  <div
                    key={String(a._id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2 py-0.5"
                  >
                    <Avatar className="size-4">
                      <AvatarFallback className="text-[8px]">{initials(`${a.firstName} ${a.lastName}`)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px]">{a.firstName} {a.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
            <Row label="Assigned by">{assigner ? `${assigner.firstName} ${assigner.lastName}` : "—"}</Row>
            <Row label="Due date">{task.dueDate ? formatDate(task.dueDate) : "—"}</Row>
            <Row label="Priority">{task.priority}</Row>
            <Row label="Status">{String(task.status).replace("_", " ")}</Row>
            {task.relatedType && task.relatedType !== "none" && (
              <Row label="Related">{task.relatedType} · {task.relatedLabel ?? String(task.relatedId)}</Row>
            )}
            <Row label="Created">{task.createdAt ? relativeTime(task.createdAt) : "—"}</Row>
            {task.completedAt && <Row label="Completed">{formatDateTime(task.completedAt)}</Row>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-4" /> Activity ({task.comments?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!task.comments || task.comments.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border-subtle)] p-5 text-center text-xs text-[var(--color-text-muted)]">
              No comments yet. Be the first to add context.
            </div>
          ) : (
            <div className="space-y-3">
              {task.comments.map((c, i) => {
                const u = c.userId as unknown as { firstName?: string; lastName?: string } | null;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[9px]">{initials(`${u?.firstName ?? ""} ${u?.lastName ?? ""}`)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px]">
                        <span className="font-medium">{u?.firstName} {u?.lastName}</span>{" "}
                        <span className="text-[var(--color-text-muted)]">· {relativeTime(c.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">{c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-[var(--color-text-muted)]">{label}</div>
      <div>{children}</div>
    </div>
  );
}
