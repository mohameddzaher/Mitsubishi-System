"use client";

import * as React from "react";

export function Sparkline({
  data,
  width = 180,
  height = 36,
  stroke = "var(--color-brand)",
  fill = "rgba(230, 0, 18, 0.08)",
}: {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = pad + innerH - (d.value / max) * innerH;
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.[0]} ${height - pad} L ${points[0]?.[0]} ${height - pad} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block">
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart({
  data,
  width = 260,
  height = 140,
  color = "var(--color-brand)",
}: {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pad = 20;
  const innerW = width - pad * 2;
  const innerH = height - pad;
  const barWidth = (innerW / data.length) * 0.72;
  const gap = (innerW / data.length) * 0.28;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
      {data.map((d, i) => {
        const barH = (d.value / max) * innerH;
        const x = pad + i * (barWidth + gap) + gap / 2;
        const y = height - barH - 4;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={color}
              opacity={0.85}
              rx={2}
            >
              <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={height - 1}
              fontSize="8"
              textAnchor="middle"
              fill="var(--color-text-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function HorizontalBar({
  data,
  color = "var(--color-brand)",
}: {
  data: Array<{ label: string; value: number; accent?: string }>;
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="text-[11px]">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="truncate text-[var(--color-text-secondary)]">{d.label}</span>
              <span className="font-mono text-[var(--color-text-primary)]">{d.value.toLocaleString()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.accent ?? color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  data,
  size = 140,
  strokeWidth = 18,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total === 0) return null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-bg-elevated)"
        strokeWidth={strokeWidth}
      />
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circumference;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          >
            <title>{`${d.label}: ${d.value.toLocaleString()} (${(pct * 100).toFixed(1)}%)`}</title>
          </circle>
        );
        offset += dash;
        return el;
      })}
      <text
        x={size / 2}
        y={size / 2 - 2}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="var(--color-text-primary)"
      >
        {total.toLocaleString()}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 12}
        textAnchor="middle"
        fontSize="8"
        fill="var(--color-text-muted)"
      >
        TOTAL
      </text>
    </svg>
  );
}
