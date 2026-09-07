"use client";

import { useState } from "react";
import { Sheet, SubmitButton } from "@/components/Sheet";
import { Icon } from "@/components/icons";

export interface DateRange {
  fromMs: number | undefined;
  toMs: number;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const PRESETS: { id: "today" | "7d" | "30d" | "month" | "all"; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Airbnb-style: tap a start date, then an end date. Tapping again after a
// range is complete starts a new one; tapping before the current start
// moves the start back instead of erroring.
export function DateRangeSheet({
  open,
  onClose,
  initial,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initial: DateRange;
  onApply: (range: DateRange) => void;
}) {
  const initialStart = initial.fromMs !== undefined ? startOfDay(new Date(initial.fromMs)) : null;
  const initialEnd =
    initial.fromMs !== undefined && Number.isFinite(initial.toMs) ? startOfDay(new Date(initial.toMs - 1)) : null;

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initialStart ?? new Date()));
  // A single piece of state (not separate start/end) so tapDay's functional
  // update always sees the truly-latest selection, even if two taps land in
  // the same React batch - reading start/end from the render closure could
  // otherwise let a fast second tap act on stale values.
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({
    start: initialStart,
    end: initialEnd,
  });
  const { start, end } = range;

  if (!open) return null;

  const today = startOfDay(new Date());
  const isCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  function shift(delta: number) {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  }

  function tapDay(d: Date) {
    setRange((prev) => {
      if (!prev.start || prev.end) return { start: d, end: null };
      if (d.getTime() < prev.start.getTime()) return { start: d, end: null };
      return { start: prev.start, end: d };
    });
  }

  function applyPreset(id: (typeof PRESETS)[number]["id"]) {
    if (id === "all") {
      onApply({ fromMs: undefined, toMs: Infinity });
      onClose();
      return;
    }
    const rangeEnd = startOfDay(new Date());
    let rangeStart = rangeEnd;
    if (id === "7d") {
      rangeStart = new Date(rangeEnd);
      rangeStart.setDate(rangeStart.getDate() - 6);
    } else if (id === "30d") {
      rangeStart = new Date(rangeEnd);
      rangeStart.setDate(rangeStart.getDate() - 29);
    } else if (id === "month") {
      rangeStart = startOfMonth(rangeEnd);
    }
    onApply({ fromMs: rangeStart.getTime(), toMs: rangeEnd.getTime() + 86400000 });
    onClose();
  }

  function apply() {
    if (!start) return;
    const rangeEnd = end ?? start;
    onApply({ fromMs: start.getTime(), toMs: rangeEnd.getTime() + 86400000 });
    onClose();
  }

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const startWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Sheet open={open} onClose={onClose} title="Select dates" subtitle="Tap a start date, then an end date.">
      <div className="flex gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: "var(--text-2)" }}
        >
          <Icon.chevronLeft size={14} />
        </button>
        <span className="text-[13.5px] font-bold w-[150px] text-center" style={{ color: "var(--text)" }}>
          {viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => !isCurrentMonth && shift(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: "var(--text-2)", opacity: isCurrentMonth ? 0.3 : 1 }}
        >
          <Icon.chevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold" style={{ color: "var(--text-3)" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isFuture = d.getTime() > today.getTime();
          const isStart = start !== null && d.getTime() === start.getTime();
          const isEnd = end !== null && d.getTime() === end.getTime();
          const inRange = start !== null && end !== null && d.getTime() > start.getTime() && d.getTime() < end.getTime();
          const isToday = d.getTime() === today.getTime();
          const isEdge = isStart || isEnd;
          return (
            <button
              key={i}
              type="button"
              disabled={isFuture}
              onClick={() => tapDay(d)}
              className="rounded-lg flex items-center justify-center aspect-square text-[12px] font-semibold"
              style={{
                background: isEdge
                  ? "var(--ink)"
                  : inRange
                    ? "color-mix(in srgb, var(--ink) 12%, transparent)"
                    : "transparent",
                color: isEdge ? "var(--ink-inverse)" : "var(--text)",
                opacity: isFuture ? 0.3 : 1,
                boxShadow: isToday && !isEdge ? "inset 0 0 0 1.5px var(--ink)" : "none",
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <SubmitButton onClick={apply} disabled={!start}>
        Apply
      </SubmitButton>
    </Sheet>
  );
}
