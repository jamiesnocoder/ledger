"use client";

import { useState } from "react";
import { fmtCompact } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { AmountEntry } from "@/lib/compute";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// A plain, self-navigating month grid - each day cell shows its net total.
// Days outside the active [rangeFromMs, rangeToMs) selection are shown blank
// even if they have entries, so the grid always reflects "just these dates";
// browsing to another month with the arrows temporarily looks past that to
// let you get your bearings.
export function CalendarView({
  entries,
  initialMonth,
  rangeFromMs,
  rangeToMs,
}: {
  entries: AmountEntry[];
  initialMonth: Date;
  rangeFromMs?: number;
  rangeToMs?: number;
}) {
  const [month, setMonth] = useState(() => startOfMonth(initialMonth));

  const year = month.getFullYear();
  const mo = month.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const startWeekday = new Date(year, mo, 1).getDay();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && mo === today.getMonth();

  function shift(delta: number) {
    setMonth(new Date(year, mo + delta, 1));
  }

  const totals = new Array(daysInMonth + 1).fill(0);
  const hasEntry = new Array(daysInMonth + 1).fill(false);
  entries.forEach((e) => {
    const d = new Date(e.ts);
    if (d.getFullYear() !== year || d.getMonth() !== mo) return;
    if (rangeFromMs !== undefined && e.ts < rangeFromMs) return;
    if (rangeToMs !== undefined && e.ts >= rangeToMs) return;
    totals[d.getDate()] += e.amount;
    hasEntry[d.getDate()] = true;
  });

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full px-1">
      <div className="flex items-center justify-center gap-3 mb-2.5">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ color: "var(--text-2)" }}
        >
          <Icon.chevronLeft size={12} />
        </button>
        <span className="text-[11.5px] font-bold w-[110px] text-center" style={{ color: "var(--text)" }}>
          {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => !isCurrentMonth && shift(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ color: "var(--text-2)", opacity: isCurrentMonth ? 0.3 : 1 }}
        >
          <Icon.chevronRight size={12} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[9.5px] font-bold" style={{ color: "var(--text-3)" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const total = totals[day];
          const isToday = today.getFullYear() === year && today.getMonth() === mo && today.getDate() === day;
          return (
            <div
              key={i}
              className="rounded-lg flex flex-col items-center justify-center gap-0.5 aspect-square"
              style={{
                background: hasEntry[day] ? "var(--surface-2)" : "transparent",
                boxShadow: isToday ? "inset 0 0 0 1.5px var(--ink)" : "none",
              }}
            >
              <div className="text-[9.5px] font-semibold" style={{ color: "var(--text-3)" }}>
                {day}
              </div>
              {hasEntry[day] && (
                <div className="num text-[9px] font-extrabold" style={{ color: "var(--text)" }}>
                  {fmtCompact(total)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
