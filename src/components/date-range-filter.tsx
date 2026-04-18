"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Preset = {
  key: string;
  label: string;
};

const PRESETS: Preset[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
];

export function DateRangeFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("range") ?? "this_month";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  const [showCustom, setShowCustom] = React.useState(current === "custom");

  function setPreset(key: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("range", key);
    sp.delete("from");
    sp.delete("to");
    router.push(`?${sp.toString()}`, { scroll: false });
    setShowCustom(key === "custom");
  }

  function applyCustom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(params.toString());
    sp.set("range", "custom");
    sp.set("from", String(fd.get("from") ?? ""));
    sp.set("to", String(fd.get("to") ?? ""));
    router.push(`?${sp.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-0.5">
        <Calendar className="ml-1.5 size-3 text-[var(--color-text-muted)]" />
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPreset(p.key)}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-medium transition-colors",
              current === p.key
                ? "bg-[var(--color-brand-muted)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <form onSubmit={applyCustom} className="flex items-center gap-1.5">
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-7 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-[11px]"
            required
          />
          <span className="text-[10px] text-[var(--color-text-muted)]">→</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-7 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-[11px]"
            required
          />
          <button
            type="submit"
            className="h-7 rounded-md border border-[var(--color-brand)] bg-[var(--color-brand-muted)] px-2 text-[11px] font-medium hover:bg-[var(--color-brand)]/30"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}

export function resolveDateRange(range: string, from?: string, to?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "today":
      return { start: startOfToday, end: endOfToday, label: "Today" };
    case "yesterday": {
      const y = new Date(startOfToday);
      y.setDate(y.getDate() - 1);
      const yEnd = new Date(y);
      yEnd.setHours(23, 59, 59);
      return { start: y, end: yEnd, label: "Yesterday" };
    }
    case "this_week": {
      const d = new Date(startOfToday);
      // ISO Sunday start: 0=Sun, 6=Sat — KSA week usually Sat-Fri, let's use Sat
      const dow = d.getDay();
      const diff = (dow + 1) % 7; // days since Saturday
      d.setDate(d.getDate() - diff);
      return { start: d, end: endOfToday, label: "This week" };
    }
    case "this_quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { start: new Date(now.getFullYear(), q * 3, 1), end: endOfToday, label: "This quarter" };
    }
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday, label: "This year" };
    case "custom": {
      if (from && to) {
        const s = new Date(from);
        const e = new Date(to);
        e.setHours(23, 59, 59);
        return { start: s, end: e, label: `${from} → ${to}` };
      }
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday, label: "This month" };
    }
    case "this_month":
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday, label: "This month" };
  }
}
