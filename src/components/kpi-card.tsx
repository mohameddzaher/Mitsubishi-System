import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: number; label?: string; invert?: boolean };
  icon?: React.ReactNode;
  accent?: "default" | "gold" | "success" | "danger" | "warning" | "info";
  className?: string;
  large?: boolean;
  href?: string;
};

const accentBg: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  default: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]",
  gold: "bg-[var(--color-accent-gold-muted)] text-[var(--color-accent-gold)]",
  success: "bg-[rgba(16,185,129,0.12)] text-[var(--color-success)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[var(--color-danger)]",
  warning: "bg-[rgba(245,158,11,0.12)] text-[var(--color-warning)]",
  info: "bg-[rgba(59,130,246,0.12)] text-[var(--color-info)]",
};

export function KpiCard({ label, value, hint, delta, icon, accent = "default", className, large, href }: KpiCardProps) {
  const deltaValue = delta?.value ?? 0;
  const isUp = deltaValue > 0;
  const isDown = deltaValue < 0;
  const good = delta?.invert ? isDown : isUp;
  const bad = delta?.invert ? isUp : isDown;

  const footer = hint || delta;

  const body = (
    <div
      className={cn(
        "group relative flex h-full min-h-[128px] flex-col overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-all",
        href && "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--color-border-default)] hover:shadow-md",
        !href && "hover:border-[var(--color-border-default)]",
        accent === "gold" && "luxe-kpi-gold",
        large && "min-h-[148px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          <span>{label}</span>
          {href && <ArrowUpRight className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />}
        </div>
        {icon && (
          <div className={cn("flex size-9 items-center justify-center rounded-md", accentBg[accent])}>
            {icon}
          </div>
        )}
      </div>

      <div
        className={cn(
          "mt-2 animate-count-up font-semibold tracking-tight text-[var(--color-text-primary)]",
          large ? "text-[30px] leading-[36px]" : "text-[24px] leading-[30px]",
        )}
      >
        {value}
      </div>

      {/* Footer always rendered to keep heights equal */}
      <div className="mt-auto flex min-h-[18px] items-center gap-2 pt-2 text-[11px]">
        {delta ? (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                good && "bg-[rgba(16,185,129,0.12)] text-[var(--color-success)]",
                bad && "bg-[rgba(239,68,68,0.12)] text-[var(--color-danger)]",
                deltaValue === 0 && "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]",
              )}
            >
              {isUp ? <TrendingUp className="size-2.5" /> : isDown ? <TrendingDown className="size-2.5" /> : <Minus className="size-2.5" />}
              {Math.abs(deltaValue).toFixed(1)}%
            </span>
            {(hint ?? delta?.label) && (
              <span className="truncate text-[var(--color-text-muted)]">{hint ?? delta?.label}</span>
            )}
          </>
        ) : hint ? (
          <span className="truncate text-[var(--color-text-muted)]">{hint}</span>
        ) : (
          <span className="text-transparent">.</span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}
