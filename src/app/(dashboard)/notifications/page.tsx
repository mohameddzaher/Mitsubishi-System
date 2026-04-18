import Link from "next/link";
import { requireSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, Inbox } from "lucide-react";
import { formatDateTime, relativeTime, cn } from "@/lib/utils";
import { MarkAllReadForm } from "./mark-all-read-form";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; type?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  await connectDB();

  const filter: Record<string, unknown> = {
    userId: session.user.id,
    archivedAt: null,
  };
  if (sp.filter === "unread") filter.readAt = null;
  if (sp.type) filter.type = sp.type;

  const [items, stats] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(200).lean(),
    Notification.aggregate([
      { $match: { userId: session.user.id, archivedAt: null } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
  ]);

  const unreadCount = await Notification.countDocuments({
    userId: session.user.id,
    readAt: null,
    archivedAt: null,
  });

  // Group by day
  const grouped: Record<string, typeof items> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const n of items) {
    const d = new Date(n.createdAt);
    let key: string;
    if (d >= today) key = "Today";
    else if (d >= yesterday) key = "Yesterday";
    else if (d >= weekAgo) key = "This week";
    else key = "Older";
    grouped[key] = grouped[key] ?? [];
    grouped[key]!.push(n);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread · ${items.length} total`}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && <MarkAllReadForm />}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Pill href="/notifications" active={!sp.filter} label="All" />
        <Pill href="/notifications?filter=unread" active={sp.filter === "unread"} label={`Unread (${unreadCount})`} />
        {stats.slice(0, 6).map((s) => (
          <Pill
            key={s._id}
            href={`/notifications?type=${s._id}`}
            active={sp.type === s._id}
            label={`${String(s._id).replace(/_/g, " ")} (${s.count})`}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-4" />}
          title="No notifications"
          description="You will see task assignments, visit updates, and system alerts here."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, list]) => (
            <div key={day}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {day}
              </div>
              <div className="space-y-2">
                {list.map((n) => (
                  <Link key={String(n._id)} href={n.link || "#"}>
                    <Card
                      className={cn(
                        "transition-colors hover:border-[var(--color-border-default)]",
                        !n.readAt && "border-[var(--color-brand)]/30 bg-[var(--color-brand-muted)]/10",
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-[var(--color-bg-elevated)]">
                            <Bell className="size-3.5 text-[var(--color-brand)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium">{n.title}</span>
                                {!n.readAt && <Badge variant="primary">New</Badge>}
                              </div>
                              <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                                {relativeTime(n.createdAt)}
                              </span>
                            </div>
                            {n.body && (
                              <div className="mt-0.5 text-[11.5px] text-[var(--color-text-secondary)]">{n.body}</div>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                              <Badge variant="outline">{String(n.type).replace(/_/g, " ")}</Badge>
                              <span>· {formatDateTime(n.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-muted)] px-2.5 py-1 text-[11px] font-medium"
          : "rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)]"
      }
    >
      {label}
    </Link>
  );
}
