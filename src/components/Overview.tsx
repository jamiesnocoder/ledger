"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DonutChart, type DonutSlice } from "@/components/DonutChart";
import { LineChart } from "@/components/LineChart";
import { BarChart } from "@/components/BarChart";
import { ActivityList, ActivityRow, type FeedItem } from "@/components/ActivityList";
import { EditEntrySheet, entryKeyFor, type EditTarget } from "@/components/EditEntrySheet";
import {
  computeBalances,
  computeHistory,
  computeMadeByKind,
  computeSpendByCategory,
  dailyMade,
  dailySpend,
  pickableAccounts,
  timeframeSinceMs,
  toEur,
  type Timeframe,
} from "@/lib/compute";
import { Icon } from "@/components/icons";
import type { Account, AccountTransaction, Currency, Expense, ExpenseCategory } from "@/lib/types";

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

// The whole screen swipes now, not just the chart: left page is everything
// that decreased a balance (expenses + negative txns), middle is net worth
// plus the full combined feed, right is everything that increased a balance
// (positive txns).
type PageKind = "spent" | "networth" | "made";
const PAGE_ORDER: PageKind[] = ["spent", "networth", "made"];

type NetWorthGroup = "total" | "cash" | "daytrading" | "investment";

function daysForTimeframe(tf: Timeframe): number {
  if (tf === "week") return 7;
  if (tf === "month") return 30;
  return 90;
}

// Full labels for a 7-day window (matches the day-of-week look); for longer
// windows only ~6 evenly spaced labels are kept so they don't overlap.
function trendBarLabels(days: number): string[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const step = Math.max(1, Math.ceil(days / 6));
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const idx = days - 1 - i;
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const show = days <= 7 || idx % step === 0;
    labels.push(show ? (days <= 7 ? d.toLocaleDateString("en-GB", { weekday: "short" }) : String(d.getDate())) : "");
  }
  return labels;
}

const byDateDesc = (a: FeedItem, b: FeedItem) => new Date(b.ts).getTime() - new Date(a.ts).getTime();

export function Overview({
  accounts,
  transactions,
  expenses,
  categories,
  usdToEur,
  onChanged,
}: {
  accounts: Account[];
  transactions: AccountTransaction[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  usdToEur: number;
  onChanged: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(1); // 0 = Spent (left), 1 = Net worth (middle), 2 = Made (right)
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [now] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<Record<PageKind, "donut" | "trend">>({
    spent: "donut",
    networth: "donut",
    made: "donut",
  });
  const [netWorthGroup, setNetWorthGroup] = useState<NetWorthGroup>("total");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Land on the middle page (Net worth) on first paint.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.clientWidth;
  }, []);

  const { byAccount, total } = computeBalances(accounts, transactions, usdToEur);
  const sinceMs = timeframeSinceMs(timeframe, now);
  const currencyById: Record<string, Currency> = {};
  accounts.forEach((a) => (currencyById[a.id] = a.currency));

  // Net worth mixes currencies, so slice values (and the proportions they
  // drive) are normalized to EUR here - everywhere else an account's own
  // balance stays in its own currency.
  const netWorthSlices: DonutSlice[] = accounts.map((a) => ({
    id: a.id,
    label: a.name,
    value: toEur(byAccount[a.id] ?? 0, a.currency, usdToEur),
  }));

  const spendByCategory = computeSpendByCategory(expenses, categories, sinceMs);
  const spentSlices: DonutSlice[] = spendByCategory.map((c) => ({
    id: c.category?.id ?? "uncategorized",
    label: c.category?.name ?? "Uncategorized",
    value: c.total,
  }));
  const spentTotal = spendByCategory.reduce((s, c) => s + c.total, 0);

  const madeByKind = computeMadeByKind(transactions, sinceMs);
  const madeSlices: DonutSlice[] = madeByKind.map((k) => ({
    id: k.kind,
    label: k.label,
    value: k.total,
  }));
  const madeTotal = madeByKind.reduce((s, k) => s + k.total, 0);

  // Net worth trend: cumulative running balance for the selected group,
  // seeded with that group's starting balance(s), always full history.
  // Starting balances (like the transactions below) are converted to EUR
  // wherever a group can span both currencies.
  const startingBalanceInEurFor = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? toEur(a.starting_balance ?? 0, a.currency, usdToEur) : 0;
  };
  const netWorthGroupAccounts =
    netWorthGroup === "total"
      ? accounts
      : netWorthGroup === "cash"
        ? pickableAccounts(accounts)
        : accounts.filter((a) => a.id === netWorthGroup);
  const netWorthGroupTxns =
    netWorthGroup === "total"
      ? transactions
      : netWorthGroup === "cash"
        ? transactions.filter((t) => pickableAccounts(accounts).some((a) => a.id === t.account_id))
        : netWorthGroup === "daytrading"
          ? transactions.filter((t) => t.account_id === "daytrading")
          : transactions.filter((t) => t.account_id === "investment");
  const netWorthGroupStart =
    netWorthGroup === "total"
      ? accounts.reduce((s, a) => s + toEur(a.starting_balance ?? 0, a.currency, usdToEur), 0)
      : netWorthGroup === "cash"
        ? pickableAccounts(accounts).reduce((s, a) => s + toEur(a.starting_balance ?? 0, a.currency, usdToEur), 0)
        : netWorthGroup === "daytrading"
          ? startingBalanceInEurFor("daytrading")
          : startingBalanceInEurFor("investment");
  // Anchors the trend line's first point to the group's earliest account
  // creation date, seeded with the starting balance - so with zeroBaseline
  // off below, that point lands at the bottom-left corner (x/y axis
  // crossing) instead of forced-zero floating it above the true start.
  const netWorthGroupStartTs = netWorthGroupAccounts.length
    ? Math.min(...netWorthGroupAccounts.map((a) => new Date(a.created_at).getTime()))
    : undefined;
  const netWorthHistory = computeHistory(
    netWorthGroupTxns,
    undefined,
    netWorthGroupStart,
    currencyById,
    usdToEur,
    netWorthGroupStartTs
  );

  // Day Trading/Investing tabs only appear once those accounts exist.
  const netWorthGroups: { id: NetWorthGroup; label: string }[] = [
    { id: "total", label: "Total" },
    { id: "cash", label: "Cash" },
    ...(accounts.some((a) => a.id === "daytrading") ? [{ id: "daytrading" as const, label: "Day Trading" }] : []),
    ...(accounts.some((a) => a.id === "investment") ? [{ id: "investment" as const, label: "Investing" }] : []),
  ];

  const trendDays = daysForTimeframe(timeframe);
  const spentDailyPoints = dailySpend(expenses, trendDays);
  const madeDailyPoints = dailyMade(transactions, trendDays);
  const trendLabels = trendBarLabels(trendDays);

  function toggleView(kind: PageKind) {
    setViewMode((prev) => ({ ...prev, [kind]: prev[kind] === "donut" ? "trend" : "donut" }));
  }

  function goToPage(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    setPage(i);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function onScrollerScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      const width = el.clientWidth;
      if (!width) return;
      setPage(Math.round(el.scrollLeft / width));
    }, 100);
  }

  function txnToFeedItem(t: AccountTransaction): FeedItem {
    const acc = accounts.find((a) => a.id === t.account_id);
    return {
      id: t.id,
      title: t.note || labelForKind(t.kind),
      meta: acc?.name ?? t.account_id,
      amount: t.amount,
      signed: true,
      currency: acc?.currency ?? "EUR",
      ts: t.occurred_at,
      iconKey: KIND_ICON[t.kind] ?? "tag",
      colorVar: "--text-2",
    };
  }

  function expenseToFeedItem(e: Expense): FeedItem {
    const cat = categories.find((c) => c.id === e.category_id);
    const acc = accounts.find((a) => a.id === e.account_id);
    return {
      id: e.id,
      title: e.title,
      meta: cat?.name ?? "Uncategorized",
      amount: e.amount,
      signed: false,
      currency: acc?.currency ?? "EUR",
      ts: e.occurred_at,
      iconKey: (cat?.icon as keyof typeof Icon) ?? "tag",
      colorVar: "--text-2",
    };
  }

  // Middle: everything, exactly as before. account_transactions already
  // carries a row for every tracked expense (kind: 'expense'), so only
  // untracked expenses (no account) need adding separately here.
  const allFeed: FeedItem[] = [
    ...transactions.map(txnToFeedItem),
    ...expenses.filter((e) => !e.account_id).map(expenseToFeedItem),
  ]
    .sort(byDateDesc)
    .slice(0, 40);

  // Left: every expense (tracked or not) plus any other negative-amount
  // transaction that isn't already an expense (withdrawals, trade/investment
  // losses, transfers out, negative adjustments).
  const expenseFeed: FeedItem[] = [
    ...expenses.map(expenseToFeedItem),
    ...transactions.filter((t) => t.amount < 0 && t.kind !== "expense").map(txnToFeedItem),
  ]
    .sort(byDateDesc)
    .slice(0, 40);

  // Right: every positive-amount transaction (deposits, gifts, trade/
  // investment gains, transfers in, positive adjustments).
  const madeFeed: FeedItem[] = transactions
    .filter((t) => t.amount > 0)
    .map(txnToFeedItem)
    .sort(byDateDesc)
    .slice(0, 40);

  // Resolves a feed item back to its underlying record(s) so the edit sheet
  // can show the right form: an expense, a transfer (its linked out/in
  // pair), or a plain account transaction.
  function openEdit(id: string) {
    const txn = transactions.find((t) => t.id === id);
    if (txn) {
      if (txn.expense_id) {
        const exp = expenses.find((e) => e.id === txn.expense_id);
        if (exp) {
          setEditTarget({ kind: "expense", expense: exp });
          return;
        }
      }
      if (txn.transfer_id) {
        const pair = transactions.filter((t) => t.transfer_id === txn.transfer_id);
        const out = pair.find((t) => t.kind === "transfer_out");
        const inn = pair.find((t) => t.kind === "transfer_in");
        if (out && inn) {
          setEditTarget({
            kind: "transfer",
            transferId: txn.transfer_id,
            amount: Math.abs(out.amount),
            note: out.note ?? "",
            occurredAt: out.occurred_at,
            fromId: out.account_id,
            toId: inn.account_id,
          });
          return;
        }
      }
      setEditTarget({ kind: "txn", txn });
      return;
    }
    const exp = expenses.find((e) => e.id === id);
    if (exp) setEditTarget({ kind: "expense", expense: exp });
  }

  // With timeframe pills, the title gets its own centered row above them
  // (two rows). Without pills (Net worth), that second row would just be an
  // empty strip next to the toggle - so the title takes the pills' centered
  // slot instead, staying centered and landing on the same row as the
  // toggle, with no leftover gap.
  function ControlRow({
    title,
    showTimeframe,
    isTrend,
    onToggle,
  }: {
    title: string;
    showTimeframe: boolean;
    isTrend: boolean;
    onToggle: () => void;
  }) {
    const titleEl = (
      <div className="text-center text-[11.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text)" }}>
        {title}
      </div>
    );
    return (
      <div className="w-full px-2 mb-2">
        {showTimeframe && <div className="mb-1.5">{titleEl}</div>}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div />
          {showTimeframe ? <TimeframePills value={timeframe} onChange={setTimeframe} /> : titleEl}
          <div className="flex justify-end">
            <ChartModeToggle active={isTrend} onClick={onToggle} />
          </div>
        </div>
      </div>
    );
  }

  function renderChartCard(kind: PageKind) {
    const isTrend = viewMode[kind] === "trend";
    return (
      <div className="rounded-2xl" style={{ background: "var(--surface)", padding: "20px 4px", boxShadow: "var(--shadow)" }}>
        {kind === "networth" && (
          <>
            <ControlRow title="Net worth" showTimeframe={false} isTrend={isTrend} onToggle={() => toggleView("networth")} />
            {isTrend ? (
              <div className="w-full px-2">
                <NetWorthGroupPills value={netWorthGroup} onChange={setNetWorthGroup} groups={netWorthGroups} />
                <LineChart points={netWorthHistory} height={200} full zeroBaseline={false} />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <DonutChart slices={netWorthSlices} total={total} totalLabel="Net worth" />
              </div>
            )}
          </>
        )}
        {kind === "spent" && (
          <>
            <ControlRow title="Spent" showTimeframe isTrend={isTrend} onToggle={() => toggleView("spent")} />
            {isTrend ? (
              <div className="w-full px-2">
                <BarChart points={spentDailyPoints} labels={trendLabels} />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <DonutChart slices={spentSlices} total={spentTotal} totalLabel="Spent" />
              </div>
            )}
          </>
        )}
        {kind === "made" && (
          <>
            <ControlRow title="Made" showTimeframe isTrend={isTrend} onToggle={() => toggleView("made")} />
            {isTrend ? (
              <div className="w-full px-2">
                <LineChart points={madeDailyPoints} height={160} full />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <DonutChart slices={madeSlices} total={madeTotal} totalLabel="Made" />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderFeed(items: FeedItem[], emptyHint: string) {
    const groups = groupByDay(items);
    if (groups.length === 0) {
      return <ActivityList items={[]} emptyHint={emptyHint} />;
    }
    return groups.map((g) => (
      <div key={g.key} className="mt-5 first:mt-0">
        <div className="text-[13.5px] font-bold tracking-wide mb-1" style={{ color: "var(--text-3)" }}>
          {g.label}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          {g.items.map((item, i) => (
            <ActivityRow key={item.id} item={item} onClick={() => openEdit(item.id)} divider={i < g.items.length - 1} />
          ))}
        </div>
      </div>
    ));
  }

  function renderPage(kind: PageKind) {
    const feedItems = kind === "spent" ? expenseFeed : kind === "made" ? madeFeed : allFeed;
    const emptyHint =
      kind === "spent"
        ? "Nothing spent yet."
        : kind === "made"
          ? "Nothing made yet."
          : "Tap the + button to add your first entry.";
    return (
      <div key={kind} className="w-full h-full shrink-0 overflow-y-auto px-5 pb-28" style={{ scrollSnapAlign: "start" }}>
        <section className="pt-2">{renderChartCard(kind)}</section>
        <section className="mt-7">{renderFeed(feedItems, emptyHint)}</section>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <div
        ref={scrollerRef}
        onScroll={onScrollerScroll}
        className="h-full flex overflow-x-auto"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {PAGE_ORDER.map((kind) => renderPage(kind))}
      </div>

      <div
        className="flex justify-center gap-1.5"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          zIndex: 25,
          padding: "8px 11px",
          borderRadius: 999,
          background: "color-mix(in srgb, var(--surface) 82%, transparent)",
          backdropFilter: "blur(10px)",
          boxShadow: "var(--shadow)",
        }}
      >
        {PAGE_ORDER.map((kind, i) => (
          <button
            key={kind}
            aria-label={`Show ${kind}`}
            onClick={() => goToPage(i)}
            className="rounded-full"
            style={{
              width: page === i ? 16 : 5,
              height: 5,
              background: page === i ? "var(--ink)" : "var(--border-strong)",
              transition: "width .2s",
            }}
          />
        ))}
      </div>

      <EditEntrySheet
        key={entryKeyFor(editTarget)}
        target={editTarget}
        accounts={accounts}
        categories={categories}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onChanged={onChanged}
      />
    </div>
  );
}

function ChartModeToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Show breakdown" : "Show trend over time"}
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
      style={{
        background: active ? "var(--ink)" : "var(--surface-2)",
        color: active ? "var(--ink-inverse)" : "var(--text-2)",
      }}
    >
      <Icon.toggleView size={13} />
    </button>
  );
}

function NetWorthGroupPills({
  value,
  onChange,
  groups,
}: {
  value: NetWorthGroup;
  onChange: (g: NetWorthGroup) => void;
  groups: { id: NetWorthGroup; label: string }[];
}) {
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5 mb-2" style={{ background: "var(--surface-2)" }}>
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onChange(g.id)}
          className="flex-1 px-1.5 py-1.5 rounded-md text-[10.5px] font-bold"
          style={{
            background: value === g.id ? "var(--surface)" : "transparent",
            color: value === g.id ? "var(--text)" : "var(--text-3)",
          }}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function TimeframePills({ value, onChange }: { value: Timeframe; onChange: (t: Timeframe) => void }) {
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--surface-2)" }}>
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
