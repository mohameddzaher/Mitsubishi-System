"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Check, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  markNotificationRead,
  markAllNotificationsRead,
  getRecentNotifications,
} from "@/server/notifications/actions";
import { cn, relativeTime } from "@/lib/utils";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority?: string;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await getRecentNotifications(10);
      setItems(data.items as unknown as NotificationItem[]);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleClick(n: NotificationItem) {
    if (!n.readAt) {
      try {
        await markNotificationRead(n._id);
        setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, readAt: new Date().toISOString() } : i)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all read");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[var(--color-brand)] px-1 font-mono text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[380px]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-3 py-2">
          <div>
            <div className="text-xs font-semibold">Notifications</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={handleMarkAll}>
              <Check /> Mark all
            </Button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Inbox className="mx-auto mb-2 size-5 text-[var(--color-text-muted)]" />
              <div className="text-xs text-[var(--color-text-muted)]">
                No notifications yet.
              </div>
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n._id}
                href={n.link || "#"}
                onClick={() => handleClick(n)}
                className={cn(
                  "group flex items-start gap-2 border-b border-[var(--color-border-subtle)] px-3 py-2.5 transition-colors last:border-0 hover:bg-[var(--color-bg-overlay)]",
                  !n.readAt && "bg-[var(--color-brand-muted)]/30",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    !n.readAt ? "bg-[var(--color-brand)]" : "bg-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                      {n.title}
                    </div>
                    <span className="shrink-0 text-[9.5px] text-[var(--color-text-muted)]">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  {n.body && (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-secondary)]">
                      {n.body}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t border-[var(--color-border-subtle)] px-3 py-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            View all notifications →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
