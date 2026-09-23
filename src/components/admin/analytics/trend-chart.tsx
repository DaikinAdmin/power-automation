"use client";

import { useMemo, useState } from "react";
import type { FinancialTrendRow } from "@/types/analytics";
import { fmt } from "@/lib/analytics-utils";

interface TrendChartProps {
  rows: FinancialTrendRow[];
  netLabel: string;
  vatLabel: string;
  noDataLabel: string;
}

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 56 };

const NET_COLOR = "#2563eb"; // blue-600
const VAT_COLOR = "#d97706"; // amber-600

export function TrendChart({ rows, netLabel, vatLabel, noDataLabel }: TrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { netPoints, vatPoints, maxValue, plotWidth, plotHeight } = useMemo(() => {
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const maxValue = Math.max(1, ...rows.map((r) => Math.max(r.totalNet, r.totalVat)));
    const step = rows.length > 1 ? plotWidth / (rows.length - 1) : 0;

    const toPoint = (value: number, index: number) => {
      const x = PADDING.left + step * index;
      const y = PADDING.top + plotHeight - (value / maxValue) * plotHeight;
      return `${x},${y}`;
    };

    return {
      netPoints: rows.map((r, i) => toPoint(r.totalNet, i)),
      vatPoints: rows.map((r, i) => toPoint(r.totalVat, i)),
      maxValue,
      plotWidth,
      plotHeight,
    };
  }, [rows]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{noDataLabel}</p>;
  }

  const step = rows.length > 1 ? plotWidth / (rows.length - 1) : 0;
  const hovered = hoverIndex != null ? rows[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${netLabel} / ${vatLabel}`}
      >
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PADDING.top + plotHeight - f * plotHeight;
          return (
            <line
              key={f}
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}
        <text x={4} y={PADDING.top + 4} fontSize={9} fill="#9ca3af">
          {fmt(maxValue, 0)}
        </text>
        <text x={4} y={PADDING.top + plotHeight} fontSize={9} fill="#9ca3af">
          0
        </text>

        <polyline points={netPoints.join(" ")} fill="none" stroke={NET_COLOR} strokeWidth={2} strokeLinecap="round" />
        <polyline points={vatPoints.join(" ")} fill="none" stroke={VAT_COLOR} strokeWidth={2} strokeLinecap="round" />

        {rows.map((r, i) => {
          const x = PADDING.left + step * i;
          return (
            <g key={r.period}>
              <circle cx={x} cy={PADDING.top + plotHeight - (r.totalNet / maxValue) * plotHeight} r={3} fill={NET_COLOR} />
              <circle cx={x} cy={PADDING.top + plotHeight - (r.totalVat / maxValue) * plotHeight} r={3} fill={VAT_COLOR} />
              <rect
                x={x - step / 2}
                y={PADDING.top}
                width={Math.max(step, 8)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((prev) => (prev === i ? null : prev))}
              />
              {hoverIndex === i && (
                <line x1={x} x2={x} y1={PADDING.top} y2={PADDING.top + plotHeight} stroke="#d1d5db" strokeDasharray="2,2" />
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{rows[0]?.period}</span>
        {rows.length > 1 && <span>{rows[rows.length - 1]?.period}</span>}
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NET_COLOR }} />
          {netLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: VAT_COLOR }} />
          {vatLabel}
        </span>
      </div>

      {hovered && (
        <div className="mt-1 text-xs text-gray-700">
          <span className="font-medium">{hovered.period}</span>
          {" — "}
          {netLabel}: {fmt(hovered.totalNet)}, {vatLabel}: {fmt(hovered.totalVat)}
        </div>
      )}
    </div>
  );
}
