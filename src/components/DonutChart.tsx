"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/format";

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
}

const SIZE = 220;
const STROKE = 40;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const GAP_DEG = 1.4; // visual surface gap between slices

// Shades of --ink (black in light mode, white in dark mode) mixed toward
// --surface, cycled by position - slices read apart by lightness while
// staying inside the app's monochrome palette.
const SHADE_MIX_PERCENTS = [100, 78, 60, 45, 32, 22, 14, 8];
function shadeFor(index: number) {
  return `color-mix(in srgb, var(--ink) ${SHADE_MIX_PERCENTS[index % SHADE_MIX_PERCENTS.length]}%, var(--surface))`;
}

export function DonutChart({
  slices,
  total,
  totalLabel = "Net worth",
}: {
  slices: DonutSlice[];
  total: number;
  totalLabel?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const positive = slices.filter((s) => s.value > 0);
  const sum = positive.reduce((s, x) => s + x.value, 0);

  // Color is assigned from the full slice list (not just the positive ones)
  // so a slice keeps the same color in the legend even when its arc is
  // temporarily hidden at zero value.
  const colorById = new Map(slices.map((s, i) => [s.id, shadeFor(i)]));

  const arcs = positive.reduce<Array<DonutSlice & { startDeg: number; deg: number; fraction: number }>>(
    (acc, s) => {
      const fraction = sum > 0 ? s.value / sum : 0;
      const deg = fraction * 360;
      const startDeg = acc.length ? acc[acc.length - 1].startDeg + acc[acc.length - 1].deg : 0;
      acc.push({ ...s, startDeg, deg, fraction });
      return acc;
    },
    []
  );

  const activeSlice = arcs.find((a) => a.id === active);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          {arcs.length === 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={STROKE}
              strokeDasharray="1 10"
              strokeLinecap="round"
            />
          )}
          {arcs.map((a) => {
            // No gap to cut when this is the only slice - otherwise a 100%
            // (or near-100%) slice shows as a circle with a notch bitten out
            // of it instead of a smooth, unbroken ring.
            const hasGap = arcs.length > 1;
            const gapLen = hasGap ? (GAP_DEG / 360) * C : 0;
            const arcLen = Math.max((a.deg / 360) * C - gapLen, 0);
            const offset = (a.startDeg / 360) * C + gapLen / 2;
            const isActive = active === a.id;
            const isDim = active !== null && !isActive;
            return (
              <circle
                key={a.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={colorById.get(a.id)}
                strokeWidth={isActive ? STROKE + 4 : STROKE}
                strokeDasharray={`${arcLen} ${C - arcLen}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                opacity={isDim ? 0.35 : 1}
                style={{
                  cursor: "pointer",
                  transition: "opacity .15s, stroke-width .15s, stroke-dasharray .4s ease, stroke-dashoffset .4s ease",
                }}
                onPointerEnter={() => setActive(a.id)}
                onPointerLeave={() => setActive(null)}
                onClick={() => setActive(isActive ? null : a.id)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            {activeSlice ? activeSlice.label : totalLabel}
          </div>
          <div className="num font-extrabold tabular-nums" style={{ fontSize: 26, letterSpacing: "-0.02em", marginTop: 4 }}>
            {fmtMoney(activeSlice ? activeSlice.value : total)}
          </div>
          {activeSlice && (
            <div className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-3)" }}>
              {Math.round(activeSlice.fraction * 100)}% of holdings
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-7 gap-y-3.5 w-full px-2">
        {slices.map((s) => (
          <button
            key={s.id}
            onPointerEnter={() => setActive(s.id)}
            onPointerLeave={() => setActive(null)}
            onClick={() => setActive(active === s.id ? null : s.id)}
            className="flex items-start gap-2 text-left rounded-lg px-1.5 py-1.5 -mx-1.5"
            style={{ background: active === s.id ? "var(--surface-2)" : "transparent" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-[3px]"
              style={{ background: colorById.get(s.id), opacity: s.value > 0 ? 1 : 0.35 }}
            />
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-semibold leading-snug" style={{ color: "var(--text-2)" }}>
                {s.label}
              </span>
              <span className="num block text-[12.5px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {fmtMoney(s.value)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
