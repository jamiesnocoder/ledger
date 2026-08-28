"use client";

import { useRef, useState } from "react";
import { DonutChart, type DonutSlice } from "@/components/DonutChart";
import { ActivityList, ActivityRow, type FeedItem } from "@/components/ActivityList";
import {
  computeBalances,
  computeMadeByKind,
  computeSpendByCategory,
  timeframeSinceMs,
  type Timeframe,
} from "@/lib/compute";
import { deleteAccountTransaction, deleteExpense, deleteTransfer } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { fmtMoney } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { Account, AccountTransaction, Expense, ExpenseCategory } from "@/lib/types";

const KIND_ICON: Record<string, keyof typeof Icon> = {
  cash: "cash",
  gift: "gift",
  trade: "trade",
  investment: "invest",
  transfer_out: "transfer",
  transfer_in: "transfer",
  adjustment: "plus",
  expense: "bag",
};

// Every slice/dot in this app renders the same tone - proportions and taps
// (not color) are what tell accounts, categories, or sources apart.
const MONO = "--ink";
const CHART_HEIGHT = 400;
const PAGES = ["Net worth", "Spent", "Made"] as const;

export function Overview({
  accounts,
  transactions,
  expenses,
  categories,
  onOpenQuickAdd,
  onChanged,
}: {
  accounts: Account[];
  transactions: AccountTransaction[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  onOpenQuickAdd: (accountId: string) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [chartPage, setChartPage] = useState(0);
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [now] = useState(() => Date.now());

  const { byAccount, total } = computeBalances(accounts, transactions);
  const sinceMs = timeframeSinceMs(timeframe, now);

  const netWorthSlices: DonutSlice[] = accounts.map((a) => ({
    id: a.id,
    label: a.name,
    value: byAccount[a.id] ?? 0,
    colorVar: MONO,
  }));

  const spendByCategory = computeSpendByCategory(expenses, categories, sinceMs);
  const spentSlices: DonutSlice[] = spendByCategory.map((c) => ({
    id: c.category?.id ?? "uncategorized",
    label: c.category?.name ?? "Uncategorized",
    value: c.total,
    colorVar: MONO,
  }));
  const spentTotal = spendByCategory.reduce((s, c) => s + c.total, 0);

  const madeByKind = computeMadeByKind(transactions, sinceMs);
  const madeSlices: DonutSlice[] = madeByKind.map((k) => ({
    id: k.kind,
    label: k.label,
    value: k.total,
    colorVar: MONO,
  }));
  const madeTotal = madeByKind.reduce((s, k) => s + k.total, 0);

  function goToChart(i: number) {
    setChartPage(i);
    scrollerRef.current?.scrollTo({ left: i * scrollerRef.current.clientWidth, behavior: "smooth" });
  }

  function onChartScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== chartPage) setChartPage(idx);
  }

  // One combined, reverse-chronological feed. account_transactions already
  // carries a row for every expense that was paid from a tracked account
  // (kind: 'expense'), so only untracked expenses (no account) need adding
  // separately - otherwise those would show up twice.
  const feed: FeedItem[] = [
    ...transactions.map((t) => {
      const acc = accounts.find((a) => a.id === t.account_id);
      return {
        id: t.id,
        title: t.note || labelForKind(t.kind),
        meta: acc?.name ?? t.account_id,
        amount: t.amount,
        signed: true,
        ts: t.occurred_at,
        iconKey: KIND_ICON[t.kind] ?? "tag",
        colorVar: "--text-2",
      };
    }),
    ...expenses
      .filter((e) => !e.account_id)
      .map((e) => {
        const cat = categories.find((c) => c.id === e.category_id);
        return {
          id: e.id,
          title: e.title,
          meta: cat?.name ?? "Untracked",
          amount: e.amount,
          signed: false,
          ts: e.occurred_at,
          iconKey: (cat?.icon as keyof typeof Icon) ?? "tag",
          colorVar: "--text-2",
        };
      }),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 30);

  const groups = groupByDay(feed);

  async function handleDelete(id: string) {
    try {
      const txn = transactions.find((t) => t.id === id);
      if (txn) {
        if (txn.expense_id) await deleteExpense(txn.expense_id);
        else if (txn.transfer_id) await deleteTransfer(txn.transfer_id);
        else await deleteAccountTransaction(id);
      } else {
        await deleteExpense(id);
      }
      toast("Entry deleted");
      onChanged();
    } catch {
      toast("Couldn't delete — try again");
    }
  }

  return (
    <div className="px-5 pb-28">
      <section className="pt-2">
        <div
          ref={scrollerRef}
          onScroll={onChartScroll}
          className="flex overflow-x-auto"
          style={{ height: CHART_HEIGHT, scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        >
          <div className="w-full shrink-0 flex flex-col items-center justify-center" style={{ scrollSnapAlign: "start" }}>
            <DonutChart slices={netWorthSlices} total={total} totalLabel="Net worth" />
          </div>
          <div className="w-full shrink-0 flex flex-col items-center justify-center" style={{ scrollSnapAlign: "start" }}>
            <TimeframePills value={timeframe} onChange={setTimeframe} />
            <DonutChart slices={spentSlices} total={spentTotal} totalLabel="Spent" />
          </div>
          <div className="w-full shrink-0 flex flex-col items-center justify-center" style={{ scrollSnapAlign: "start" }}>
            <TimeframePills value={timeframe} onChange={setTimeframe} />
            <DonutChart slices={madeSlices} total={madeTotal} totalLabel="Made" />
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-3">
          {PAGES.map((label, i) => (
            <button
              key={label}
              aria-label={`Show ${label}`}
              onClick={() => goToChart(i)}
              className="rounded-full"
              style={{
                width: chartPage === i ? 16 : 5,
                height: 5,
                background: chartPage === i ? "var(--ink)" : "var(--border-strong)",
                transition: "width .2s",
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        {accounts.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpenQuickAdd(a.id)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            style={{ borderBottom: i < accounts.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <span className="text-[13.5px] font-semibold">{a.name}</span>
            <span className="num text-[13.5px] font-semibold">{fmtMoney(byAccount[a.id] ?? 0)}</span>
          </button>
        ))}
      </section>

      <section className="mt-7">
        {groups.length === 0 ? (
          <ActivityList items={[]} emptyHint="Tap the + button to add your first entry." onDelete={handleDelete} />
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div
                className="text-[11.5px] font-bold uppercase tracking-wide mt-5 mb-1 first:mt-0"
                style={{ color: "var(--text-3)" }}
              >
                {g.label}
              </div>
              {g.items.map((item) => (
                <ActivityRow key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function TimeframePills({ value, onChange }: { value: Timeframe; onChange: (t: Timeframe) => void }) {
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5 mb-4" style={{ background: "var(--surface-2)" }}>
      {(["week", "month", "all"] as const).map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => onChange(tf)}
          className="px-3.5 py-1.5 rounded-md text-[11px] font-bold"
          style={{
            background: value === tf ? "var(--surface)" : "transparent",
            color: value === tf ? "var(--text)" : "var(--text-3)",
          }}
        >
          {tf === "all" ? "All time" : tf === "week" ? "Week" : "Month"}
        </button>
      ))}
    </div>
  );
}

interface DayGroup {
  key: string;
  label: string;
  items: FeedItem[];
}

function groupByDay(items: FeedItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  items.forEach((item) => {
    const d = new Date(item.ts);
    const key = d.toDateString();
    let group = groups[groups.length - 1]?.key === key ? groups[groups.length - 1] : undefined;
    if (!group) {
      group = { key, label: groups.length === 0 ? "Latest" : dayLabel(d), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
}

function dayLabel(d: Date) {
  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function labelForKind(kind: string) {
  switch (kind) {
    case "cash":
      return "Cash";
    case "gift":
      return "Gift";
    case "trade":
      return "Trade";
    case "investment":
      return "Investment";
    case "transfer_out":
    case "transfer_in":
      return "Transfer";
    case "expense":
      return "Expense";
    default:
      return "Balance update";
  }
}
