"use client";

import { fmtCompact } from "@/lib/format";
import type { AmountEntry } from "@/lib/compute";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// A plain month grid - each day cell just shows its net total for the
// entries that fall on it. No drill-down, no color scale; the day's number
// already tells the story.
export function CalendarView({ entries, month }: { entries: AmountEntry[]; month: Date }) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const startWeekday = new Date(year, mo, 1).getDay();

  const totals = new Array(daysInMonth + 1).fill(0);
  entries.forEach((e) => {
    const d = new Date(e.ts);
    if (d.getFullYear() === year && d.getMonth() === mo) totals[d.getDate()] += e.amount;
  });

  const today = new Date();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full px-1">
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
                background: total !== 0 ? "var(--surface-2)" : "transparent",
                boxShadow: isToday ? "inset 0 0 0 1.5px var(--ink)" : "none",
              }}
            >
              <div className="text-[9.5px] font-semibold" style={{ color: "var(--text-3)" }}>
                {day}
              </div>
              {total !== 0 && (
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
