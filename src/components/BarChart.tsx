"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/format";
import type { HistoryPoint } from "@/lib/compute";

const W = 300;
const H = 130;
const PAD_TOP = 14;
const PAD_BOTTOM = 20;
const AXIS_W = 30;
const PLOT_W = W - AXIS_W;
const BAR_MAX = 24;
const GRID_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

export function BarChart({
  points,
  labels,
}: {
  points: HistoryPoint[];
  labels: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value), 1);
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const n = points.length;
  const slot = PLOT_W / n;
  const barW = Math.min(BAR_MAX, slot * 0.5);

  if (points.every((p) => p.value === 0)) {
    return (
      <div
        className="flex items-center justify-center text-[11.5px] rounded-lg"
        style={{ height: H, color: "var(--text-3)", borderTop: "1px dashed var(--border-strong)" }}
      >
        No spending yet
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        {GRID_FRACTIONS.map((f) => {
          const y = PAD_TOP + plotH * (1 - f);
          return (
            <g key={f}>
              <line x1={0} x2={PLOT_W} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PLOT_W + 6} y={y} dy={3} fontSize={9} fontWeight={600} fill="var(--text-3)">
                {Math.round(max * f)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const x = i * slot + slot / 2 - barW / 2;
          const h = max > 0 ? (p.value / max) * plotH : 0;
          const y = PAD_TOP + (plotH - h);
          const isHover = hover === i;
          return (
            <g key={p.ts}>
              <rect
                x={x - 4}
                y={PAD_TOP}
                width={barW + 8}
                height={plotH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, p.value > 0 ? 3 : 0)}
                rx={4}
                fill="var(--ink)"
                opacity={isHover || hover === null ? 1 : 0.35}
                style={{ transition: "opacity .12s" }}
              />
              <text
                x={i * slot + slot / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill="var(--text-3)"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="absolute pointer-events-none rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold"
          style={{
            left: `${((hover * slot + slot / 2) / W) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
            whiteSpace: "nowrap",
          }}
        >
          <span className="num">{fmtMoney(points[hover].value)}</span>
        </div>
      )}
    </div>
  );
}
