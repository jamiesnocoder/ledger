import type { Account, AccountTransaction, Currency, Expense, ExpenseCategory } from "@/lib/types";

// "daytrading" and "investment" are reserved for their dedicated P&L flows -
// every other account (the defaults plus anything a user adds) is a normal
// pickable balance for cash-style deposits/withdrawals and expense payment.
export function pickableAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.id !== "daytrading" && a.id !== "investment");
}

// Only Net Worth aggregates across accounts into one figure, so only there
// does a USD account's amount get converted - everywhere else (that
// account's own balance, its transactions) stays in its own currency.
export function toEur(amount: number, currency: Currency | undefined, usdToEur: number): number {
  return currency === "USD" ? amount * usdToEur : amount;
}

export interface Balances {
  byAccount: Record<string, number>;
  total: number;
}

export function computeBalances(accounts: Account[], txns: AccountTransaction[], usdToEur: number): Balances {
  const byAccount: Record<string, number> = {};
  accounts.forEach((a) => (byAccount[a.id] = a.starting_balance ?? 0));
  txns.forEach((t) => {
    if (byAccount[t.account_id] !== undefined) byAccount[t.account_id] += t.amount;
  });
  const total = accounts.reduce((s, a) => s + toEur(byAccount[a.id] ?? 0, a.currency, usdToEur), 0);
  return { byAccount, total };
}

export interface HistoryPoint {
  ts: number;
  value: number;
}

// Cumulative running-balance points, for one account or the overall total
// (accountId omitted). startingValue seeds the running total so history
// begins from an account's starting balance instead of zero. currencyById +
// usdToEur convert each transaction's amount before accumulating, so a
// group spanning EUR and USD accounts (Net Worth) still sums correctly.
// Assumes txns is already sorted ascending by time, or sorts a copy if not.
export function computeHistory(
  txns: AccountTransaction[],
  accountId?: string,
  startingValue = 0,
  currencyById?: Record<string, Currency>,
  usdToEur = 1
): HistoryPoint[] {
  const list = txns
    .filter((t) => (accountId ? t.account_id === accountId : true))
    .slice()
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  let running = startingValue;
  return list.map((t) => {
    running += toEur(t.amount, currencyById?.[t.account_id], usdToEur);
    return { ts: new Date(t.occurred_at).getTime(), value: running };
  });
}

export interface CategorySpend {
  category: ExpenseCategory | null;
  total: number;
  count: number;
}

export function computeSpendByCategory(
  expenses: Expense[],
  categories: ExpenseCategory[],
  sinceMs?: number
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, CategorySpend>();
  expenses
    .filter((e) => (sinceMs ? new Date(e.occurred_at).getTime() >= sinceMs : true))
    .forEach((e) => {
      const key = e.category_id ?? "__none";
      const existing = totals.get(key);
      const category = e.category_id ? (byId.get(e.category_id) ?? null) : null;
      if (existing) {
        existing.total += e.amount;
        existing.count += 1;
      } else {
        totals.set(key, { category, total: e.amount, count: 1 });
      }
    });
  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

export type Timeframe = "week" | "month" | "all";

// Start-of-range cutoff (ms since epoch) for a timeframe pill, or undefined
// for "all time" (no lower bound).
export function timeframeSinceMs(tf: Timeframe, now: number): number | undefined {
  if (tf === "all") return undefined;
  if (tf === "week") return now - 7 * 86400000;
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MADE_KINDS = new Set(["cash", "gift", "trade", "investment"]);
const MADE_LABELS: Record<string, string> = {
  cash: "Cash",
  gift: "Gifts",
  trade: "Day Trading",
  investment: "Investing",
};

export interface KindTotal {
  kind: string;
  label: string;
  total: number;
}

// "Money made" - positive inflows only (deposits, gifts, and trading/
// investment gains), excluding transfers between your own accounts and
// manual balance adjustments, which aren't really "made" money.
export function computeMadeByKind(txns: AccountTransaction[], sinceMs?: number): KindTotal[] {
  const totals = new Map<string, number>();
  txns
    .filter((t) => t.amount > 0 && MADE_KINDS.has(t.kind))
    .filter((t) => (sinceMs ? new Date(t.occurred_at).getTime() >= sinceMs : true))
    .forEach((t) => {
      totals.set(t.kind, (totals.get(t.kind) ?? 0) + t.amount);
    });
  return Array.from(totals.entries())
    .map(([kind, total]) => ({ kind, label: MADE_LABELS[kind] ?? kind, total }))
    .sort((a, b) => b.total - a.total);
}

export function spendInRange(expenses: Expense[], fromMs: number, toMs: number) {
  return expenses
    .filter((e) => {
      const t = new Date(e.occurred_at).getTime();
      return t >= fromMs && t < toMs;
    })
    .reduce((s, e) => s + e.amount, 0);
}

// Daily totals for the last N days (oldest first) - used by the spending
// bar chart.
export function dailySpend(expenses: Expense[], days: number): HistoryPoint[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const buckets: HistoryPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.push({ ts: d.getTime(), value: 0 });
  }
  expenses.forEach((e) => {
    const t = new Date(e.occurred_at).getTime();
    const dayStart = new Date(t);
    dayStart.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.ts === dayStart.getTime());
    if (bucket) bucket.value += e.amount;
  });
  return buckets;
}

// Daily "money made" totals for the last N days (oldest first) - the same
// shape as dailySpend, for the Made trend bar chart.
export function dailyMade(txns: AccountTransaction[], days: number): HistoryPoint[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const buckets: HistoryPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.push({ ts: d.getTime(), value: 0 });
  }
  txns
    .filter((t) => t.amount > 0 && MADE_KINDS.has(t.kind))
    .forEach((t) => {
      const ts = new Date(t.occurred_at).getTime();
      const dayStart = new Date(ts);
      dayStart.setHours(0, 0, 0, 0);
      const bucket = buckets.find((b) => b.ts === dayStart.getTime());
      if (bucket) bucket.value += t.amount;
    });
  return buckets;
}
