"use client";

import { useId, useState } from "react";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { HistoryPoint } from "@/lib/compute";

const W = 300;

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
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
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
  const pd = pathData(points, height, padY);
  const last = pd.coords[pd.coords.length - 1];

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
            y2={height}
            stroke="var(--border-strong)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {hover !== null && (
        <div
          className="absolute pointer-events-none rounded-lg px-2.5 py-1.5 text-[11.5px] z-10"
          style={{
            left: `${(pd.coords[hover][0] / W) * 100}%`,
            top: `${(pd.coords[hover][1] / height) * 100}%`,
            transform: "translate(-50%, -115%)",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
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
