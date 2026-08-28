import type { Account, AccountTransaction, Expense, ExpenseCategory } from "@/lib/types";

export interface Balances {
  byAccount: Record<string, number>;
  total: number;
}

export function computeBalances(accounts: Account[], txns: AccountTransaction[]): Balances {
  const byAccount: Record<string, number> = {};
  accounts.forEach((a) => (byAccount[a.id] = 0));
  txns.forEach((t) => {
    if (byAccount[t.account_id] !== undefined) byAccount[t.account_id] += t.amount;
  });
  const total = Object.values(byAccount).reduce((s, v) => s + v, 0);
  return { byAccount, total };
}

export interface HistoryPoint {
  ts: number;
  value: number;
}

// Cumulative running-balance points, for one account or the overall total
// (accountId omitted). Assumes txns is already sorted ascending by time,
// or sorts a copy if not.
export function computeHistory(
  txns: AccountTransaction[],
  accountId?: string
): HistoryPoint[] {
  const list = txns
    .filter((t) => (accountId ? t.account_id === accountId : true))
    .slice()
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  let running = 0;
  return list.map((t) => {
    running += t.amount;
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
