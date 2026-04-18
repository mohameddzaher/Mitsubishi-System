"use client";

import * as React from "react";
import { Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { toggleChecklistItem } from "@/server/work-orders/actions";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  itemId: string;
  label: string;
  category: string;
  required: boolean;
  completed: boolean;
  issue: boolean;
  notes: string;
};

export function ChecklistPanel({
  workOrderId,
  checklist,
  editable,
}: {
  workOrderId: string;
  checklist: ChecklistItem[];
  editable: boolean;
}) {
  const [items, setItems] = React.useState(checklist);
  const [pending, setPending] = React.useState<string | null>(null);

  async function toggle(itemId: string, completed: boolean) {
    if (!editable) return;
    setPending(itemId);
    setItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, completed } : i)));
    try {
      await toggleChecklistItem(workOrderId, itemId, completed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      // rollback
      setItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, completed: !completed } : i)));
    } finally {
      setPending(null);
    }
  }

  const completedCount = items.filter((i) => i.completed).length;
  const requiredCount = items.filter((i) => i.required).length;
  const requiredDone = items.filter((i) => i.required && i.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs">
        <span>
          <span className="font-semibold">{completedCount}</span>
          <span className="text-[var(--color-text-muted)]"> of {items.length} done</span>
          <span className="ml-3 text-[var(--color-text-muted)]">
            Required: {requiredDone}/{requiredCount}
          </span>
        </span>
        {!editable && (
          <Badge variant="outline">Read-only</Badge>
        )}
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <label
            key={item.itemId}
            className={cn(
              "flex items-start gap-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-2.5 text-xs transition-colors",
              editable ? "cursor-pointer hover:border-[var(--color-border-default)]" : "",
              item.completed && "bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.2)]",
            )}
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={!editable || pending === item.itemId}
              onChange={(e) => toggle(item.itemId, e.target.checked)}
              className="mt-0.5 size-3.5 accent-[var(--color-success)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn(item.completed && "text-[var(--color-text-muted)] line-through")}>
                  {item.label}
                </span>
                {item.required && <Badge variant="outline">Required</Badge>}
                {item.issue && (
                  <Badge variant="danger">
                    <AlertCircle className="size-2.5" /> Issue
                  </Badge>
                )}
              </div>
              {item.notes && (
                <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{item.notes}</div>
              )}
            </div>
            <span className="text-[9.5px] uppercase tracking-wider text-[var(--color-text-muted)]">
              {item.category}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
