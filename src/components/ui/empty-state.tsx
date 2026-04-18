import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/40 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
