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
  usdToEur = 1,
  startTs?: number
): HistoryPoint[] {
  const list = txns
    .filter((t) => (accountId ? t.account_id === accountId : true))
    .slice()
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  let running = startingValue;
  const points: HistoryPoint[] = startTs !== undefined ? [{ ts: startTs, value: running }] : [];
  list.forEach((t) => {
    running += toEur(t.amount, currencyById?.[t.account_id], usdToEur);
    points.push({ ts: new Date(t.occurred_at).getTime(), value: running });
  });
  return points;
}

export interface CategorySpend {
  category: ExpenseCategory | null;
  total: number;
  count: number;
}

export function computeSpendByCategory(
  expenses: Expense[],
  categories: ExpenseCategory[],
  sinceMs?: number,
  untilMs?: number
): CategorySpend[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, CategorySpend>();
  expenses
    .filter((e) => (sinceMs ? new Date(e.occurred_at).getTime() >= sinceMs : true))
    .filter((e) => (untilMs !== undefined ? new Date(e.occurred_at).getTime() < untilMs : true))
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

export const MADE_KINDS = new Set(["cash", "gift", "trade", "investment"]);
export const MADE_LABELS: Record<string, string> = {
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

// Whether a transaction counts toward "Made": deposits/gifts/trading gains
// are always eligible, but an account set to "revenue" mode only counts its
// positive transactions (a plain deposit), while "profit" mode nets gains
// and losses together (a trading account logging each trade's P&L result).
export function isMadeEligible(t: AccountTransaction, accounts: Account[]): boolean {
  if (!MADE_KINDS.has(t.kind)) return false;
  const acc = accounts.find((a) => a.id === t.account_id);
  if (acc?.made_mode === "profit") return true;
  return t.amount > 0;
}

// "Money made" - deposits, gifts, and trading/investment results (netted for
// accounts in profit mode, see isMadeEligible) - excluding transfers between
// your own accounts and manual balance adjustments, which aren't really
// "made" money.
export function computeMadeByKind(
  txns: AccountTransaction[],
  accounts: Account[],
  sinceMs?: number,
  untilMs?: number
): KindTotal[] {
  const totals = new Map<string, number>();
  txns
    .filter((t) => isMadeEligible(t, accounts))
    .filter((t) => (sinceMs ? new Date(t.occurred_at).getTime() >= sinceMs : true))
    .filter((t) => (untilMs !== undefined ? new Date(t.occurred_at).getTime() < untilMs : true))
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

export interface AmountEntry {
  ts: number;
  amount: number;
}

// First-of-month/first-of-next-month bounds (ms) for a given month, used to
// scope a period both for filtering (computeSpendByCategory/computeMadeByKind)
// and for the calendar view.
export function monthBoundsMs(month: Date): { fromMs: number; toMs: number } {
  return {
    fromMs: new Date(month.getFullYear(), month.getMonth(), 1).getTime(),
    toMs: new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime(),
  };
}

// Running total of entries within [fromMs, toMs), for the Made/Spent
// cumulative trend line. Seeded with a zero point at fromMs (bounded range,
// e.g. a specific month) so the line always starts at the axis crossing;
// "all time" (fromMs undefined) has no natural zero date, so it starts at
// the first entry instead.
export function cumulativeInRange(entries: AmountEntry[], fromMs: number | undefined, toMs: number): HistoryPoint[] {
  const list = entries
    .filter((e) => (fromMs !== undefined ? e.ts >= fromMs : true) && e.ts < toMs)
    .sort((a, b) => a.ts - b.ts);
  const points: HistoryPoint[] = fromMs !== undefined ? [{ ts: fromMs, value: 0 }] : [];
  let running = 0;
  list.forEach((e) => {
    running += e.amount;
    points.push({ ts: e.ts, value: running });
  });
  return points;
}
