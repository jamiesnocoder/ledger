"use client";

import { useState } from "react";
import { Sheet, FieldLabel, SubmitButton } from "@/components/Sheet";
import { AmountDisplay, Keypad } from "@/components/Keypad";
import { useToast } from "@/components/Toast";
import { logExpense } from "@/lib/mutations";
import { todayInputValue } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { Account, ExpenseCategory } from "@/lib/types";

type PaymentOption = "cash" | "bank" | "none";

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
  const [payment, setPayment] = useState<PaymentOption>("cash");
  const [date, setDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const numeric = parseFloat(amount || "0");

  async function submit() {
    if (!numeric || numeric <= 0 || !title.trim()) return;
    setSaving(true);
    try {
      const accountId = payment === "none" ? null : payment;
      await logExpense({
        title: title.trim(),
        amount: numeric,
        categoryId,
        accountId,
        paymentLabel: payment === "cash" ? "Cash" : payment === "bank" ? "Bank" : "Untracked",
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
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
          {(
            [
              ["cash", accounts.find((a) => a.id === "cash")?.name ?? "Cash"],
              ["bank", accounts.find((a) => a.id === "bank")?.name ?? "Bank"],
              ["none", "Untracked"],
            ] as const
          ).map(([val, label]) => {
            const active = payment === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setPayment(val)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-bold truncate px-1"
                style={{
                  background: active ? "var(--surface)" : "transparent",
                  color: active ? "var(--text)" : "var(--text-2)",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {payment === "none" && (
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
