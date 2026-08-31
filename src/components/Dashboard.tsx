"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Wordmark } from "@/components/Wordmark";
import { Overview } from "@/components/Overview";
import { ActionPicker, type Action, type ActionKey } from "@/components/ActionPicker";
import { AccountEntrySheet, type EntryConfig } from "@/components/AccountEntrySheet";
import { TransferSheet } from "@/components/TransferSheet";
import { ExpenseSheet } from "@/components/ExpenseSheet";
import { computeBalances, pickableAccounts } from "@/lib/compute";
import type { AppData } from "@/lib/data";
import type { Account } from "@/lib/types";

// Trade/Investment only make sense once those accounts exist - a user who
// doesn't trade can archive them in Settings and these quick actions (plus
// the "Cash" picker, which excludes them) disappear on their own.
function entryConfigs(accounts: Account[]): Record<Exclude<ActionKey, "transfer" | "expense">, EntryConfig> {
  return {
    cash: {
      kind: "cash",
      title: "Add Money",
      subtitle: "Deposit or withdraw from any of your accounts.",
      notePlaceholder: "e.g. Salary, ATM withdrawal",
      accountPickIds: pickableAccounts(accounts).map((a) => a.id),
      signMode: "toggle",
      signLabels: ["Deposit", "Withdraw"],
    },
    trade: {
      kind: "trade",
      title: "Add Trade",
      subtitle: "Log the profit or loss of a Day Trading trade.",
      notePlaceholder: "e.g. TSLA scalp",
      fixedAccountId: "daytrading",
      signMode: "pnl",
      signLabels: ["Profit", "Loss"],
    },
    investment: {
      kind: "investment",
      title: "Add Investment",
      subtitle: "Log the profit or loss of a swing trade.",
      notePlaceholder: "e.g. AAPL swing",
      fixedAccountId: "investment",
      signMode: "pnl",
      signLabels: ["Profit", "Loss"],
    },
  };
}

export function Dashboard({ data }: { data: AppData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Support the manifest "shortcuts" jump-in (?add=expense|cash|transfer) by
  // deriving the initial sheet state from the URL directly, rather than
  // opening it from an effect after first paint.
  const [initialAdd] = useState(() => searchParams.get("add"));
  const [entryKey, setEntryKey] = useState<Exclude<ActionKey, "transfer" | "expense"> | null>(
    initialAdd === "cash" ? "cash" : null
  );
  const [transferOpen, setTransferOpen] = useState(initialAdd === "transfer");
  const [expenseOpen, setExpenseOpen] = useState(initialAdd === "expense");

  useEffect(() => {
    if (initialAdd) router.replace("/", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChanged() {
    router.refresh();
  }

  function handlePick(key: ActionKey) {
    setPickerOpen(false);
    if (key === "transfer") setTransferOpen(true);
    else if (key === "expense") setExpenseOpen(true);
    else setEntryKey(key);
  }

  const { byAccount } = computeBalances(data.accounts, data.accountTransactions, data.usdToEur);
  const configs = entryConfigs(data.accounts);
  const hasDayTrading = data.accounts.some((a) => a.id === "daytrading");
  const hasInvestment = data.accounts.some((a) => a.id === "investment");
  const actions: Action[] = [
    { key: "expense", label: "Add Expense", sub: "Something you spent", icon: "bag" },
    { key: "cash", label: configs.cash.title, sub: configs.cash.subtitle, icon: "cash" },
    ...(hasDayTrading ? [{ key: "trade" as const, label: "Add Trade", sub: "Day Trading P&L", icon: "trade" as const }] : []),
    ...(hasInvestment
      ? [{ key: "investment" as const, label: "Add Investment", sub: "Investment P&L", icon: "invest" as const }]
      : []),
    { key: "transfer", label: "Transfer", sub: "Between your accounts", icon: "transfer" },
  ];

  return (
    <div className="flex flex-col h-full">
      <header
        className="shrink-0 flex items-center justify-between px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: 12,
          background: "var(--bg)",
        }}
      >
        <Wordmark size={17} />
        <Link
          href="/settings"
          aria-label="Settings"
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
          style={{ background: "var(--surface)", color: "var(--text-2)", boxShadow: "var(--shadow)", transition: "transform .1s" }}
        >
          <Icon.settings size={17} />
        </Link>
      </header>

      <Overview
        accounts={data.accounts}
        transactions={data.accountTransactions}
        expenses={data.expenses}
        categories={data.categories}
        usdToEur={data.usdToEur}
        onChanged={onChanged}
      />

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Add"
        className="fixed z-30 w-14 h-14 rounded-full flex items-center justify-center active:scale-95"
        style={{
          right: "max(20px, calc((100vw - 480px) / 2 + 20px))",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
          background: "var(--ink)",
          color: "var(--ink-inverse)",
          boxShadow: "var(--shadow)",
          transition: "transform .1s",
        }}
      >
        <Icon.plus size={22} />
      </button>

      <ActionPicker actions={actions} open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />

      <AccountEntrySheet
        config={entryKey ? configs[entryKey] : null}
        accounts={data.accounts}
        open={!!entryKey}
        onClose={() => setEntryKey(null)}
        onSaved={onChanged}
      />

      <TransferSheet
        accounts={data.accounts}
        balances={byAccount}
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={onChanged}
      />

      <ExpenseSheet
        accounts={data.accounts}
        categories={data.categories}
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSaved={onChanged}
      />
    </div>
  );
}
