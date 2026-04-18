"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MAKKAH_CENTER } from "@/config/constants";

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  status: "in_visit" | "idle" | "off_duty" | "emergency";
  href?: string;
};

const STATUS_COLORS: Record<MapPoint["status"], string> = {
  emergency: "var(--color-danger)",
  in_visit: "var(--color-warning)",
  idle: "var(--color-info)",
  off_duty: "var(--color-text-muted)",
};

export function TechMap({ points }: { points: MapPoint[] }) {
  const [hovered, setHovered] = React.useState<string | null>(null);

  // Compute bounds
  const lats = points.map((p) => p.lat).filter((n) => !isNaN(n));
  const lngs = points.map((p) => p.lng).filter((n) => !isNaN(n));
  const minLat = lats.length ? Math.min(...lats) : MAKKAH_CENTER.lat - 0.08;
  const maxLat = lats.length ? Math.max(...lats) : MAKKAH_CENTER.lat + 0.08;
  const minLng = lngs.length ? Math.min(...lngs) : MAKKAH_CENTER.lng - 0.08;
  const maxLng = lngs.length ? Math.max(...lngs) : MAKKAH_CENTER.lng + 0.08;

  // Pad
  const latPad = Math.max((maxLat - minLat) * 0.15, 0.01);
  const lngPad = Math.max((maxLng - minLng) * 0.15, 0.01);
  const bounds = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };

  function project(lat: number, lng: number) {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x, y };
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]">
      {/* Grid background */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border-subtle)" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <radialGradient id="map-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-brand-muted)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-bg-base)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
        <rect width="100%" height="100%" fill="url(#map-glow)" />
      </svg>

      {/* Center crosshair marker for Makkah */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{
          left: `${project(MAKKAH_CENTER.lat, MAKKAH_CENTER.lng).x}%`,
          top: `${project(MAKKAH_CENTER.lat, MAKKAH_CENTER.lng).y}%`,
        }}
      >
        <div className="rounded-full border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 px-2 py-0.5 font-mono text-[9px] text-[var(--color-accent-gold)]">
          Al-Haram
        </div>
      </div>

      {/* Pins */}
      {points.map((p) => {
        const { x, y } = project(p.lat, p.lng);
        const isHover = hovered === p.id;
        return (
          <div
            key={p.id}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -100%)" }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <Link href={p.href ?? "#"}>
              <div className="group relative">
                {p.status === "in_visit" && (
                  <span className="absolute -inset-2 animate-ping rounded-full bg-[var(--color-warning)] opacity-30" />
                )}
                {p.status === "emergency" && (
                  <span className="absolute -inset-3 animate-ping rounded-full bg-[var(--color-danger)] opacity-40" />
                )}
                <div
                  className={cn(
                    "size-3 rounded-full border-2 border-[var(--color-bg-base)] shadow-lg transition-transform",
                    isHover && "scale-150",
                  )}
                  style={{ backgroundColor: STATUS_COLORS[p.status] }}
                />
              </div>
            </Link>
            {isHover && (
              <div className="absolute left-1/2 top-5 z-10 w-44 -translate-x-1/2 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-2 text-xs shadow-xl">
                <div className="font-medium">{p.label}</div>
                {p.sub && <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{p.sub}</div>}
                <div className="mt-1 flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] }} />
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{p.status.replace("_", " ")}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-md bg-[var(--color-bg-elevated)]/80 px-2 py-1.5 text-[10px] backdrop-blur">
        {[
          { s: "emergency" as const, label: "Emergency" },
          { s: "in_visit" as const, label: "In visit" },
          { s: "idle" as const, label: "Idle" },
          { s: "off_duty" as const, label: "Off duty" },
        ].map((l) => (
          <span key={l.s} className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[l.s] }} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="absolute bottom-2 right-2 rounded-md bg-[var(--color-bg-elevated)]/80 px-2 py-1 text-[10px] text-[var(--color-text-muted)] backdrop-blur">
        {points.length} technician{points.length === 1 ? "" : "s"} · live
      </div>
    </div>
  );
}
