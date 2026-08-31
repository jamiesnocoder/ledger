"use client";

import { useState } from "react";
import { Sheet, FieldLabel, SubmitButton } from "@/components/Sheet";
import { AmountDisplay, Keypad } from "@/components/Keypad";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { dateInputValue, todayInputValue } from "@/lib/format";
import { pickableAccounts } from "@/lib/compute";
import {
  deleteAccountTransaction,
  deleteExpense,
  deleteTransfer,
  updateAccountTransaction,
  updateExpenseEntry,
  updateTransfer,
} from "@/lib/mutations";
import type { Account, AccountTransaction, Expense, ExpenseCategory, TxnKind } from "@/lib/types";

export type EditTarget =
  | { kind: "expense"; expense: Expense }
  | { kind: "transfer"; transferId: string; amount: number; note: string; occurredAt: string; fromId: string; toId: string }
  | { kind: "txn"; txn: AccountTransaction };

// Identifies one target's identity for use as a React `key` on
// EditEntrySheet - remounting on a new key gives each entry fresh initial
// state for free, instead of an effect syncing form fields to a changed prop.
export function entryKeyFor(target: EditTarget | null): string {
  if (!target) return "none";
  if (target.kind === "expense") return `expense:${target.expense.id}`;
  if (target.kind === "transfer") return `transfer:${target.transferId}`;
  return `txn:${target.txn.id}`;
}

// Same shape as Dashboard's ENTRY_CONFIGS, keyed by the raw txn kind instead
// of the add-flow's action key, so an existing row can be re-edited with the
// same account-picker/sign-toggle rules it was created under.
const TXN_KIND_META: Partial<
  Record<TxnKind, { title: string; pickAnyAccount?: boolean; fixedAccountId?: string; signMode: "toggle" | "positive" | "pnl"; signLabels?: [string, string] }>
> = {
  cash: { title: "Cash", pickAnyAccount: true, signMode: "toggle", signLabels: ["Deposit", "Withdraw"] },
  gift: { title: "Gift", pickAnyAccount: true, signMode: "positive" },
  trade: { title: "Trade", fixedAccountId: "daytrading", signMode: "pnl", signLabels: ["Profit", "Loss"] },
  investment: { title: "Investment", fixedAccountId: "investment", signMode: "pnl", signLabels: ["Profit", "Loss"] },
  adjustment: { title: "Balance update", signMode: "toggle", signLabels: ["Add", "Remove"] },
};

export function EditEntrySheet({
  target,
  accounts,
  categories,
  open,
  onClose,
  onChanged,
}: {
  target: EditTarget | null;
  accounts: Account[];
  categories: ExpenseCategory[];
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Lazy initializers read the target once at mount. The parent remounts
  // this component (via a `key` derived from entryKeyFor) whenever a
  // different entry is opened, so these never need to re-sync in an effect.
  const [amount, setAmount] = useState(() => {
    if (!target) return "";
    if (target.kind === "expense") return String(target.expense.amount);
    if (target.kind === "transfer") return String(target.amount);
    return String(Math.abs(target.txn.amount));
  });
  const [title, setTitle] = useState(() => (target?.kind === "expense" ? target.expense.title : ""));
  const [note, setNote] = useState(() => {
    if (target?.kind === "transfer") return target.note;
    if (target?.kind === "txn") return target.txn.note ?? "";
    return "";
  });
  const [categoryId, setCategoryId] = useState<string | null>(() => (target?.kind === "expense" ? target.expense.category_id : null));
  const [accountId, setAccountId] = useState<string | null>(() => {
    if (target?.kind === "expense") return target.expense.account_id;
    if (target?.kind === "txn") return target.txn.account_id;
    return null;
  });
  const [sign, setSign] = useState(() => (target?.kind === "txn" && target.txn.amount < 0 ? -1 : 1));
  const [date, setDate] = useState(() => {
    if (!target) return todayInputValue();
    if (target.kind === "expense") return dateInputValue(target.expense.occurred_at);
    if (target.kind === "transfer") return dateInputValue(target.occurredAt);
    return dateInputValue(target.txn.occurred_at);
  });

  if (!target) return null;

  const numeric = parseFloat(amount || "0");
  const meta = target.kind === "txn" ? (TXN_KIND_META[target.txn.kind] ?? { title: "Entry", signMode: "toggle" as const }) : null;

  async function submit() {
    if (!target || !numeric || numeric <= 0) return;
    if (target.kind === "expense" && !title.trim()) return;
    setSaving(true);
    try {
      const occurredAt = new Date(date + "T12:00:00").toISOString();
      if (target.kind === "expense") {
        await updateExpenseEntry(target.expense.id, {
          title: title.trim(),
          amount: numeric,
          categoryId,
          accountId,
          occurredAt,
        });
      } else if (target.kind === "transfer") {
        await updateTransfer(target.transferId, { amount: numeric, note, occurredAt });
      } else {
        const signed = meta?.signMode === "positive" ? numeric : sign * numeric;
        await updateAccountTransaction(target.txn.id, {
          accountId: meta?.fixedAccountId ?? accountId ?? target.txn.account_id,
          amount: signed,
          note,
          occurredAt,
        });
      }
      toast("Changes saved");
      onClose();
      onChanged();
    } catch {
      toast("Couldn't save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      if (target.kind === "expense") await deleteExpense(target.expense.id);
      else if (target.kind === "transfer") await deleteTransfer(target.transferId);
      else await deleteAccountTransaction(target.txn.id);
      toast("Entry deleted");
      onClose();
      onChanged();
    } catch {
      toast("Couldn't delete — try again");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={target.kind === "expense" ? "Edit Expense" : target.kind === "transfer" ? "Edit Transfer" : `Edit ${meta?.title}`}
      subtitle={
        target.kind === "transfer"
          ? `${accounts.find((a) => a.id === target.fromId)?.name ?? target.fromId} → ${accounts.find((a) => a.id === target.toId)?.name ?? target.toId}`
          : undefined
      }
    >
      <AmountDisplay value={amount} />
      <Keypad value={amount} onChange={setAmount} />

      {target.kind === "expense" && (
        <>
          <div className="mt-4">
            <FieldLabel>Title</FieldLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
              style={inputStyle}
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
              {[...pickableAccounts(accounts).map((a) => ({ id: a.id as string | null, label: a.name })), { id: null, label: "Untracked" }].map(
                (opt) => {
                  const active = accountId === opt.id;
                  return (
                    <button
                      key={opt.id ?? "untracked"}
                      type="button"
                      onClick={() => setAccountId(opt.id)}
                      className="px-3.5 py-2 rounded-lg text-[12px] font-bold"
                      style={{
                        background: active ? "var(--ink)" : "var(--surface-2)",
                        color: active ? "var(--ink-inverse)" : "var(--text-2)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </>
      )}

      {target.kind === "txn" && (
        <>
          {meta?.signMode !== "positive" && meta?.signLabels && (
            <div className="mt-4">
              <FieldLabel>{meta.signMode === "pnl" ? "Result" : "Type"}</FieldLabel>
              <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--surface-2)" }}>
                {meta.signLabels.map((label, i) => {
                  const val = i === 0 ? 1 : -1;
                  const active = sign === val;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSign(val)}
                      className="flex-1 py-2.5 rounded-lg text-[13px] font-bold"
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
            </div>
          )}

          {meta?.pickAnyAccount && (
            <div className="mt-4">
              <FieldLabel>Account</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {pickableAccounts(accounts).map((a) => {
                  const active = (accountId ?? target.txn.account_id) === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{ border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}`, background: "var(--surface-2)" }}
                    >
                      <span className="text-[13px] font-bold truncate">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {meta?.fixedAccountId && (
            <div className="mt-4">
              <FieldLabel>Account</FieldLabel>
              <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "var(--surface-2)" }}>
                <div className="text-[13.5px] font-bold">{accounts.find((a) => a.id === meta.fixedAccountId)?.name}</div>
              </div>
            </div>
          )}
        </>
      )}

      {target.kind !== "expense" && (
        <div className="mt-4">
          <FieldLabel>Note (optional)</FieldLabel>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none" style={inputStyle} />
        </div>
      )}

      <div className="mt-4">
        <FieldLabel>Date</FieldLabel>
        <input
          type="date"
          value={date}
          max={todayInputValue()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
          style={inputStyle}
        />
      </div>

      <SubmitButton onClick={submit} disabled={!numeric || numeric <= 0 || saving}>
        {saving ? "Saving…" : "Save changes"}
      </SubmitButton>

      <button
        type="button"
        onClick={handleDelete}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl font-bold text-[13.5px] mt-2.5 flex items-center justify-center gap-2"
        style={{
          background: confirmingDelete ? "var(--ink)" : "var(--surface-2)",
          color: confirmingDelete ? "var(--ink-inverse)" : "var(--text)",
          opacity: saving ? 0.5 : 1,
        }}
      >
        {confirmingDelete ? <Icon.check size={15} /> : <Icon.trash size={15} />}
        {confirmingDelete ? "Tap again to confirm" : "Delete entry"}
      </button>
    </Sheet>
  );
}
