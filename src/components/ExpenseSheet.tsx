"use client";

import { useState } from "react";
import { Sheet, FieldLabel, SubmitButton } from "@/components/Sheet";
import { AmountDisplay, Keypad } from "@/components/Keypad";
import { useToast } from "@/components/Toast";
import { logExpense } from "@/lib/mutations";
import { pickableAccounts } from "@/lib/compute";
import { todayInputValue } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { Account, ExpenseCategory } from "@/lib/types";

export function ExpenseSheet({
  accounts,
  categories,
  open,
  onClose,
  onSaved,
}: {
  accounts: Account[];
  categories: ExpenseCategory[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  // null = untracked (spending-only, no account balance affected)
  const [payment, setPayment] = useState<string | null>(pickableAccounts(accounts)[0]?.id ?? null);
  const [date, setDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const paymentOptions = [...pickableAccounts(accounts).map((a) => ({ id: a.id, label: a.name })), { id: null, label: "Untracked" }];
  const numeric = parseFloat(amount || "0");

  async function submit() {
    if (!numeric || numeric <= 0 || !title.trim()) return;
    setSaving(true);
    try {
      await logExpense({
        title: title.trim(),
        amount: numeric,
        categoryId,
        accountId: payment,
        paymentLabel: payment ? (accounts.find((a) => a.id === payment)?.name ?? "Account") : "Untracked",
        occurredAt: new Date(date + "T12:00:00").toISOString(),
      });
      toast("Expense added");
      setAmount("");
      setTitle("");
      onClose();
      onSaved();
    } catch {
      toast("Couldn't save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add Expense" subtitle="What did you spend on?">
      <AmountDisplay value={amount} />
      <Keypad value={amount} onChange={setAmount} />

      <div className="mt-4">
        <FieldLabel>Title</FieldLabel>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Coffee, Groceries, Spotify"
          className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
        />
      </div>

      <div className="mt-4">
        <FieldLabel>Category</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => {
            const IconComp = Icon[c.icon as keyof typeof Icon] ?? Icon.tag;
            const active = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3"
                style={{ border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}`, background: "var(--surface-2)" }}
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: active ? "var(--ink)" : "var(--surface)", color: active ? "var(--ink-inverse)" : "var(--text-2)" }}
                >
                  <IconComp size={16} />
                </span>
                <span className="text-[10.5px] font-bold text-center leading-tight px-1">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel>Payment</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {paymentOptions.map((opt) => {
            const active = payment === opt.id;
            return (
              <button
                key={opt.id ?? "untracked"}
                type="button"
                onClick={() => setPayment(opt.id)}
                className="px-3.5 py-2 rounded-lg text-[12px] font-bold"
                style={{
                  background: active ? "var(--ink)" : "var(--surface-2)",
                  color: active ? "var(--ink-inverse)" : "var(--text-2)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {payment === null && (
          <div className="text-[11px] mt-1.5" style={{ color: "var(--text-3)" }}>
            Won&apos;t affect any account balance — spending-only.
          </div>
        )}
      </div>

      <div className="mt-4">
        <FieldLabel>Date</FieldLabel>
        <input
          type="date"
          value={date}
          max={todayInputValue()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
        />
      </div>

      <SubmitButton onClick={submit} disabled={!numeric || numeric <= 0 || !title.trim() || saving}>
        {saving ? "Saving…" : "Save Expense"}
      </SubmitButton>
    </Sheet>
  );
}
