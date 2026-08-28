"use client";

import { useRef, useState } from "react";
import { DonutChart, type DonutSlice } from "@/components/DonutChart";
import { BarChart } from "@/components/BarChart";
import { LineChart } from "@/components/LineChart";
import { ActivityList, type FeedItem } from "@/components/ActivityList";
import { Icon } from "@/components/icons";
import {
  computeBalances,
  computeHistory,
  computeSpendByCategory,
  dailySpend,
  spendInRange,
} from "@/lib/compute";
import { deleteAccountTransaction, deleteExpense, deleteTransfer } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import { fmtMoney } from "@/lib/format";
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

const RANGE_DAYS = 7;
const CHART_HEIGHT = 336;

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
  const [range, setRange] = useState<"week" | "month">("week");
  const [now] = useState(() => Date.now());

  const { byAccount, total } = computeBalances(accounts, transactions);

  const slices: DonutSlice[] = accounts.map((a) => ({
    id: a.id,
    label: a.name,
    value: byAccount[a.id] ?? 0,
    colorVar: `--acc-${a.id}`,
  }));

  const dayMs = 86400000;
  const monthStart = (() => {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const weekTotal = spendInRange(expenses, now - 7 * dayMs, now + dayMs);
  const bars = dailySpend(expenses, RANGE_DAYS);
  const barLabels = bars.map((b) => new Date(b.ts).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1));
  const byCategory = computeSpendByCategory(expenses, categories, range === "week" ? now - 7 * dayMs : monthStart);

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
        colorVar: `--acc-${t.account_id}`,
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
    .slice(0, 12);

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
          <div
            className="w-full shrink-0 flex flex-col items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
          >
            <DonutChart slices={slices} total={total} />
          </div>
          <div
            className="w-full shrink-0 flex flex-col items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="w-full">
              <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                Spent this week
              </div>
              <div className="num text-[32px] font-extrabold tracking-tight mt-1" style={{ letterSpacing: "-0.02em" }}>
                {fmtMoney(weekTotal)}
              </div>
              <div className="mt-4">
                <BarChart points={bars} labels={barLabels} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-3">
          {[0, 1].map((i) => (
            <button
              key={i}
              aria-label={i === 0 ? "Show net worth" : "Show spending"}
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

      <section className="mt-6">
        <div className="grid grid-cols-2 gap-2.5">
          {accounts.map((a) => {
            const hist = computeHistory(transactions, a.id);
            return (
              <div
                key={a.id}
                className="relative rounded-2xl p-3.5"
                style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd(a.id)}
                  aria-label={`Add to ${a.name}`}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                >
                  <Icon.plus size={12} />
                </button>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                  <span className="text-[12px] font-bold truncate" style={{ color: "var(--text-2)" }}>
                    {a.name}
                  </span>
                </div>
                <div className="num text-[18px] font-extrabold tracking-tight">{fmtMoney(byAccount[a.id] ?? 0)}</div>
                <div className="mt-2" style={{ height: 30 }}>
                  <LineChart points={hist} height={30} colorVar={`--acc-${a.id}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[12.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
            By Category
          </div>
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--surface-2)" }}>
            {(["week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2.5 py-1 rounded-md text-[10.5px] font-bold capitalize"
                style={{
                  background: range === r ? "var(--surface)" : "transparent",
                  color: range === r ? "var(--text)" : "var(--text-3)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {byCategory.length === 0 ? (
          <div className="text-[13px] text-center py-4" style={{ color: "var(--text-3)" }}>
            Nothing logged in this range yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {byCategory.map((c) => {
              const IconComp = Icon[(c.category?.icon as keyof typeof Icon) ?? "tag"];
              const max = byCategory[0].total;
              return (
                <div key={c.category?.id ?? "none"} className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                  >
                    <IconComp size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[12.5px] font-semibold mb-1">
                      <span className="truncate">{c.category?.name ?? "Uncategorized"}</span>
                      <span className="num shrink-0 ml-2">{fmtMoney(c.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max((c.total / max) * 100, 4)}%`, background: "var(--ink)" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-7">
        <div className="text-[12.5px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>
          Recent Activity
        </div>
        <ActivityList
          items={feed}
          emptyHint="Tap the + button to add your first entry."
          onDelete={handleDelete}
        />
      </section>
    </div>
  );
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
