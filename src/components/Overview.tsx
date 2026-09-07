"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DonutChart, type DonutSlice } from "@/components/DonutChart";
import { LineChart } from "@/components/LineChart";
import { CalendarView } from "@/components/CalendarView";
import { ActivityList, ActivityRow, type FeedItem } from "@/components/ActivityList";
import { EditEntrySheet, entryKeyFor, type EditTarget } from "@/components/EditEntrySheet";
import {
  computeBalances,
  computeHistory,
  computeMadeByKind,
  computeSpendByCategory,
  cumulativeInRange,
  isMadeEligible,
  MADE_LABELS,
  monthBoundsMs,
  pickableAccounts,
  toEur,
  type AmountEntry,
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
type ChartMode = "donut" | "trend" | "calendar";
type PeriodMode = "month" | "all";
type FilterablePage = "spent" | "made";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Entries added the same day all share noon as their occurred_at (there's no
// time picker), so ties fall back to created_at - the moment it was actually
// added - to keep the most recently added entry on top.
const byDateDesc = (a: FeedItem, b: FeedItem) =>
  new Date(b.ts).getTime() - new Date(a.ts).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

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
  const [now] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<Record<PageKind, ChartMode>>({
    spent: "donut",
    networth: "donut",
    made: "donut",
  });
  const [period, setPeriod] = useState<Record<FilterablePage, { mode: PeriodMode; month: Date }>>({
    spent: { mode: "month", month: startOfMonth(new Date(now)) },
    made: { mode: "month", month: startOfMonth(new Date(now)) },
  });
  const [category, setCategory] = useState<Record<FilterablePage, string>>({ spent: "all", made: "all" });
  const [netWorthGroup, setNetWorthGroup] = useState<NetWorthGroup>("total");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Land on the middle page (Net worth) on first paint.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.clientWidth;
  }, []);

  const { byAccount, total } = computeBalances(accounts, transactions, usdToEur);
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

  // --- Spent: category-filtered, period-scoped -----------------------------
  const spentRange = period.spent.mode === "month" ? monthBoundsMs(period.spent.month) : { fromMs: undefined, toMs: Infinity };
  const spendByCategoryAll = computeSpendByCategory(expenses, categories, spentRange.fromMs, spentRange.toMs);
  const spentCategoryOptions = [
    { id: "all", label: "All" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
    ...(expenses.some((e) => !e.category_id) ? [{ id: "uncategorized", label: "Uncategorized" }] : []),
  ];
  const spendByCategory =
    category.spent === "all" ? spendByCategoryAll : spendByCategoryAll.filter((c) => (c.category?.id ?? "uncategorized") === category.spent);
  const spentSlices: DonutSlice[] = spendByCategory.map((c) => ({
    id: c.category?.id ?? "uncategorized",
    label: c.category?.name ?? "Uncategorized",
    value: c.total,
  }));
  const spentTotal = spendByCategory.reduce((s, c) => s + c.total, 0);
  const spentEntries: AmountEntry[] = expenses
    .filter((e) => category.spent === "all" || (e.category_id ?? "uncategorized") === category.spent)
    .map((e) => ({ ts: new Date(e.occurred_at).getTime(), amount: e.amount }));
  const spentCumulative = cumulativeInRange(spentEntries, spentRange.fromMs, spentRange.toMs);

  // --- Made: kind-filtered, period-scoped -----------------------------------
  const madeRange = period.made.mode === "month" ? monthBoundsMs(period.made.month) : { fromMs: undefined, toMs: Infinity };
  const madeByKindAll = computeMadeByKind(transactions, accounts, madeRange.fromMs, madeRange.toMs);
  const madeCategoryOptions = [
    { id: "all", label: "All" },
    ...Object.keys(MADE_LABELS)
      .filter((k) => transactions.some((t) => t.kind === k))
      .map((k) => ({ id: k, label: MADE_LABELS[k] })),
  ];
  const madeByKind = category.made === "all" ? madeByKindAll : madeByKindAll.filter((k) => k.kind === category.made);
  const madeSlices: DonutSlice[] = madeByKind.map((k) => ({ id: k.kind, label: k.label, value: k.total }));
  const madeTotal = madeByKind.reduce((s, k) => s + k.total, 0);
  const madeEntries: AmountEntry[] = transactions
    .filter((t) => isMadeEligible(t, accounts))
    .filter((t) => category.made === "all" || t.kind === category.made)
    .map((t) => ({ ts: new Date(t.occurred_at).getTime(), amount: t.amount }));
  const madeCumulative = cumulativeInRange(madeEntries, madeRange.fromMs, madeRange.toMs);

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

  function setMode(kind: PageKind, mode: ChartMode) {
    setViewMode((prev) => ({ ...prev, [kind]: mode }));
  }

  // Calendar always shows one specific month, so switching to it while
  // "All time" is selected would leave no visible month context - pull the
  // period back to "Month" (keeping whatever month was last chosen) instead.
  function selectMode(kind: FilterablePage, mode: ChartMode) {
    setMode(kind, mode);
    if (mode === "calendar" && period[kind].mode === "all") setPeriodMode(kind, "month");
  }

  function setPeriodMode(kind: FilterablePage, mode: PeriodMode) {
    setPeriod((prev) => ({ ...prev, [kind]: { ...prev[kind], mode } }));
  }

  function setPeriodMonth(kind: FilterablePage, month: Date) {
    setPeriod((prev) => ({ ...prev, [kind]: { ...prev[kind], month } }));
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
      createdAt: t.created_at,
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
      createdAt: e.created_at,
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
  // losses, transfers out, negative adjustments) - unless its account has
  // opted out of Spent (e.g. a trading account, where a loss isn't everyday
  // spending).
  const expenseFeed: FeedItem[] = [
    ...expenses.map(expenseToFeedItem),
    ...transactions
      .filter((t) => t.amount < 0 && t.kind !== "expense")
      .filter((t) => accounts.find((a) => a.id === t.account_id)?.include_in_spent !== false)
      .map(txnToFeedItem),
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

  function renderChartCard(kind: PageKind) {
    const mode = viewMode[kind];
    return (
      <div className="rounded-2xl" style={{ background: "var(--surface)", padding: "20px 4px", boxShadow: "var(--shadow)" }}>
        {kind === "networth" && (
          <>
            <div className="w-full px-2 mb-2">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div />
                <div className="text-center text-[11.5px] font-bold uppercase tracking-wide" style={{ color: "var(--text)" }}>
                  Net worth
                </div>
                <div className="flex justify-end">
                  <ChartModeToggle active={mode === "trend"} onClick={() => setMode("networth", mode === "trend" ? "donut" : "trend")} />
                </div>
              </div>
            </div>
            {mode === "trend" ? (
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
            <ChartHeader
              title="Spent"
              mode={mode}
              onModeChange={(m) => selectMode("spent", m)}
              period={period.spent}
              onPeriodModeChange={(m) => setPeriodMode("spent", m)}
              onMonthChange={(d) => setPeriodMonth("spent", d)}
            />
            <FilterPills value={category.spent} onChange={(id) => setCategory((prev) => ({ ...prev, spent: id }))} options={spentCategoryOptions} />
            {mode === "trend" && (
              <div className="w-full px-2">
                <LineChart points={spentCumulative} height={180} full />
              </div>
            )}
            {mode === "calendar" && <CalendarView entries={spentEntries} month={period.spent.month} />}
            {mode === "donut" && (
              <div className="w-full flex flex-col items-center">
                <DonutChart slices={spentSlices} total={spentTotal} totalLabel="Spent" />
              </div>
            )}
          </>
        )}
        {kind === "made" && (
          <>
            <ChartHeader
              title="Made"
              mode={mode}
              onModeChange={(m) => selectMode("made", m)}
              period={period.made}
              onPeriodModeChange={(m) => setPeriodMode("made", m)}
              onMonthChange={(d) => setPeriodMonth("made", d)}
            />
            <FilterPills value={category.made} onChange={(id) => setCategory((prev) => ({ ...prev, made: id }))} options={madeCategoryOptions} />
            {mode === "trend" && (
              <div className="w-full px-2">
                <LineChart points={madeCumulative} height={180} full />
              </div>
            )}
            {mode === "calendar" && <CalendarView entries={madeEntries} month={period.made.month} />}
            {mode === "donut" && (
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

const CHART_MODES: { id: ChartMode; icon: keyof typeof Icon; label: string }[] = [
  { id: "donut", icon: "pieChart", label: "Breakdown" },
  { id: "trend", icon: "activity", label: "Trend" },
  { id: "calendar", icon: "calendar", label: "Calendar" },
];

function ChartModeSelector({ value, onChange }: { value: ChartMode; onChange: (m: ChartMode) => void }) {
  return (
    <div className="flex rounded-lg p-0.5 gap-0.5 shrink-0" style={{ background: "var(--surface-2)" }}>
      {CHART_MODES.map((m) => {
        const IconComp = Icon[m.icon];
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-label={m.label}
            aria-pressed={active}
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: active ? "var(--ink)" : "transparent", color: active ? "var(--ink-inverse)" : "var(--text-2)" }}
          >
            <IconComp size={13} />
          </button>
        );
      })}
    </div>
  );
}

function PeriodControl({
  mode,
  month,
  onModeChange,
  onMonthChange,
}: {
  mode: PeriodMode;
  month: Date;
  onModeChange: (m: PeriodMode) => void;
  onMonthChange: (d: Date) => void;
}) {
  const monthLabel = month.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  const now = new Date();
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  function shift(delta: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--surface-2)" }}>
        {(["month", "all"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className="px-2.5 py-1.5 rounded-md text-[10.5px] font-bold"
            style={{
              background: mode === m ? "var(--surface)" : "transparent",
              color: mode === m ? "var(--text)" : "var(--text-3)",
            }}
          >
            {m === "all" ? "All time" : "Month"}
          </button>
        ))}
      </div>
      {mode === "month" && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ color: "var(--text-2)" }}
          >
            <Icon.chevronLeft size={12} />
          </button>
          <span className="text-[10.5px] font-bold w-[52px] text-center" style={{ color: "var(--text)" }}>
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => !isCurrentMonth && shift(1)}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ color: "var(--text-2)", opacity: isCurrentMonth ? 0.3 : 1 }}
          >
            <Icon.chevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function ChartHeader({
  title,
  mode,
  onModeChange,
  period,
  onPeriodModeChange,
  onMonthChange,
}: {
  title: string;
  mode: ChartMode;
  onModeChange: (m: ChartMode) => void;
  period: { mode: PeriodMode; month: Date };
  onPeriodModeChange: (m: PeriodMode) => void;
  onMonthChange: (d: Date) => void;
}) {
  return (
    <div className="w-full px-2 mb-2">
      <div className="text-center text-[11.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--text)" }}>
        {title}
      </div>
      <div className="flex items-center justify-between gap-2">
        <PeriodControl mode={period.mode} month={period.month} onModeChange={onPeriodModeChange} onMonthChange={onMonthChange} />
        <ChartModeSelector value={mode} onChange={onModeChange} />
      </div>
    </div>
  );
}

function FilterPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
}) {
  if (options.length <= 1) return null;
  return (
    <div className="flex gap-1.5 overflow-x-auto px-2 pb-1 mb-2" style={{ scrollbarWidth: "none" }}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0"
            style={{ background: active ? "var(--ink)" : "var(--surface-2)", color: active ? "var(--ink-inverse)" : "var(--text-2)" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
