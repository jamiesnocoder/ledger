import type { Currency } from "@/lib/types";

const MONEY_FMT: Record<Currency, Intl.NumberFormat> = {
  EUR: new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
};

export function fmtMoney(n: number, currency: Currency = "EUR") {
  const fmt = MONEY_FMT[currency] ?? MONEY_FMT.EUR;
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const sign = v < 0 ? "-" : "";
  return sign + fmt.format(Math.abs(v));
}

export function fmtSigned(n: number, currency: Currency = "EUR") {
  const fmt = MONEY_FMT[currency] ?? MONEY_FMT.EUR;
  return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt.format(Math.abs(n));
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Compact "19 Aug" form for chart axis labels - no year, unlike fmtDate.
export function fmtAxisDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function todayInputValue() {
  return dateInputValue(new Date().toISOString());
}

// Local-timezone yyyy-mm-dd for an existing ISO timestamp, for prefilling a
// <input type="date"> when editing an entry - same conversion as
// todayInputValue but for an arbitrary date instead of "now".
export function dateInputValue(iso: string) {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}
