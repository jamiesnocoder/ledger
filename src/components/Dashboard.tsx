"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Overview } from "@/components/Overview";
import { ActionPicker, type ActionKey } from "@/components/ActionPicker";
import { AccountEntrySheet, type EntryConfig } from "@/components/AccountEntrySheet";
import { TransferSheet } from "@/components/TransferSheet";
import { ExpenseSheet } from "@/components/ExpenseSheet";
import { computeBalances } from "@/lib/compute";
import type { AppData } from "@/lib/data";

const ENTRY_CONFIGS: Record<Exclude<ActionKey, "transfer" | "expense">, EntryConfig> = {
  cash: {
    kind: "cash",
    title: "Add Cash",
    subtitle: "Money you have as cash or in your bank account.",
    notePlaceholder: "e.g. Salary, ATM withdrawal",
    accountPickIds: ["cash", "bank"],
    signMode: "toggle",
    signLabels: ["Deposit", "Withdraw"],
  },
  gift: {
    kind: "gift",
    title: "Add Gift",
    subtitle: "Money you received as a gift.",
    notePlaceholder: "e.g. From Mum",
    accountPickIds: ["cash", "bank"],
    signMode: "positive",
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
  const [quickAddAccount, setQuickAddAccount] = useState<string | null>(null);
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

  const { byAccount } = computeBalances(data.accounts, data.accountTransactions);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: 12,
          background: "linear-gradient(var(--bg) 70%, transparent)",
        }}
      >
        <div className="text-[17px] font-extrabold tracking-tight">Ledger</div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="w-9 h-9 rounded-xl border flex items-center justify-center"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
        >
          <Icon.settings size={17} />
        </Link>
      </header>

      <Overview
        accounts={data.accounts}
        transactions={data.accountTransactions}
        expenses={data.expenses}
        categories={data.categories}
        onOpenQuickAdd={(id) => setQuickAddAccount(id)}
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

      <ActionPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />

      <AccountEntrySheet
        config={entryKey ? ENTRY_CONFIGS[entryKey] : null}
        accounts={data.accounts}
        open={!!entryKey}
        onClose={() => setEntryKey(null)}
        onSaved={onChanged}
      />

      <AccountEntrySheet
        config={
          quickAddAccount
            ? {
                kind: "adjustment",
                title: `Add to ${data.accounts.find((a) => a.id === quickAddAccount)?.name ?? ""}`,
                subtitle: "Set or adjust this account's balance directly — handy for your starting balance.",
                notePlaceholder: "e.g. Starting balance",
                fixedAccountId: quickAddAccount,
                signMode: "toggle",
                signLabels: ["Add", "Remove"],
              }
            : null
        }
        accounts={data.accounts}
        open={!!quickAddAccount}
        onClose={() => setQuickAddAccount(null)}
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
