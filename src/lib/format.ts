const MONEY_FMT = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function fmtMoney(n: number) {
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  const sign = v < 0 ? "-" : "";
  return sign + MONEY_FMT.format(Math.abs(v));
}

export function fmtSigned(n: number) {
  return (n > 0 ? "+" : n < 0 ? "−" : "") + MONEY_FMT.format(Math.abs(n));
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 10);
}
