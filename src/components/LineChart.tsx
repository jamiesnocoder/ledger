"use client";

import { useId, useState } from "react";
import { fmtAxisDate, fmtMoney, fmtDate } from "@/lib/format";
import type { HistoryPoint } from "@/lib/compute";

const W = 300;
const AXIS_W = 34;
const PLOT_W = W - AXIS_W;
const DATE_LABEL_H = 14;
const GRID_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

// Evenly spaced point indices (always including the first and last) to
// label along the x-axis, so a chart with many points doesn't get a label
// under every single one of them.
function pickAxisIndices(n: number, maxLabels = 4): number[] {
  if (n <= 1) return [0];
  const count = Math.min(maxLabels, n);
  if (count <= 1) return [0];
  const indices = Array.from({ length: count }, (_, i) => Math.round((i * (n - 1)) / (count - 1)));
  return Array.from(new Set(indices));
}

function pathData(points: HistoryPoint[], h: number, padY: number) {
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals, 0);
  let max = Math.max(...vals, 0);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const top = padY;
  const bottom = h - padY;
  const x = (i: number) => (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W);
  const y = (v: number) => bottom - ((v - min) / span) * (bottom - top);
  const coords = points.map((p, i) => [x(i), y(p.value)] as const);
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(2)},${c[1].toFixed(2)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(2)},${bottom} L${coords[0][0].toFixed(2)},${bottom} Z`;
  return { coords, line, area, bottom, min, max };
}

export function LineChart({
  points,
  height = 56,
  colorVar = "--ink",
  full = false,
}: {
  points: HistoryPoint[];
  height?: number;
  colorVar?: string;
  full?: boolean;
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[11px]"
        style={{ height, color: "var(--text-3)", borderTop: full ? "1px dashed var(--border-strong)" : "none" }}
      >
        {points.length === 1 ? "Just getting started" : "No activity yet"}
      </div>
    );
  }

  const padY = full ? 10 : 4;
  const dateLabelSpace = full ? DATE_LABEL_H : 0;
  const plotHeight = height - dateLabelSpace;
  const pd = pathData(points, plotHeight, padY);
  const last = pd.coords[pd.coords.length - 1];
  const plotBottom = plotHeight - padY;
  const plotTop = padY;
  const axisIndices = full ? pickAxisIndices(points.length) : [];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * W;
    let idx = 0;
    let best = Infinity;
    pd.coords.forEach((c, i) => {
      const d = Math.abs(c[0] - relX);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    setHover(idx);
  }

  return (
    <div className="relative" style={{ height }} onPointerLeave={() => setHover(null)}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="block overflow-visible"
        onPointerMove={onMove}
      >
        {full &&
          GRID_FRACTIONS.map((f) => {
            const y = plotBottom - f * (plotBottom - plotTop);
            const value = pd.min + f * (pd.max - pd.min);
            return (
              <g key={f}>
                <line x1={0} x2={PLOT_W} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={PLOT_W + 6} y={y} dy={3} fontSize={9} fontWeight={600} fill="var(--text-3)">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(${colorVar})`} stopOpacity={0.22} />
            <stop offset="100%" stopColor={`var(${colorVar})`} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={pd.area} fill={`url(#${gradId})`} stroke="none" />
        <path
          d={pd.line}
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={last[0]}
          cy={last[1]}
          r={4}
          fill={`var(${colorVar})`}
          stroke="var(--surface)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {hover !== null && (
          <line
            x1={pd.coords[hover][0]}
            x2={pd.coords[hover][0]}
            y1={0}
            y2={plotHeight}
            stroke="var(--border-strong)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {axisIndices.map((i, labelIdx) => (
          <text
            key={i}
            x={pd.coords[i][0]}
            y={height - 3}
            textAnchor={labelIdx === 0 ? "start" : labelIdx === axisIndices.length - 1 ? "end" : "middle"}
            fontSize={9}
            fontWeight={600}
            fill="var(--text-3)"
          >
            {fmtAxisDate(points[i].ts)}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="absolute pointer-events-none rounded-lg px-2.5 py-1.5 text-[11.5px] z-10"
          style={{
            left: `${(pd.coords[hover][0] / W) * 100}%`,
            top: `${(pd.coords[hover][1] / height) * 100}%`,
            transform: "translate(-50%, -115%)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ color: "var(--text-3)", fontSize: 10.5 }}>{fmtDate(new Date(points[hover].ts).toISOString())}</div>
          <div className="num font-semibold">{fmtMoney(points[hover].value)}</div>
        </div>
      )}
    </div>
  );
}
