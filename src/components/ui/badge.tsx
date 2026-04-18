import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
        primary:
          "bg-[var(--color-brand-muted)] text-[var(--color-brand)] border border-transparent",
        success:
          "bg-[rgba(16,185,129,0.12)] text-[var(--color-success)] border border-transparent",
        warning:
          "bg-[rgba(245,158,11,0.12)] text-[var(--color-warning)] border border-transparent",
        danger:
          "bg-[rgba(239,68,68,0.12)] text-[var(--color-danger)] border border-transparent",
        info:
          "bg-[rgba(59,130,246,0.12)] text-[var(--color-info)] border border-transparent",
        gold:
          "bg-[var(--color-accent-gold-muted)] text-[var(--color-accent-gold)] border border-transparent",
        outline:
          "border border-[var(--color-border-default)] text-[var(--color-text-secondary)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
