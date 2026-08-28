"use client";

import { useState } from "react";
import { Sheet, FieldLabel, SubmitButton } from "@/components/Sheet";
import { AmountDisplay, Keypad } from "@/components/Keypad";
import { useToast } from "@/components/Toast";
import { addAccountTransaction } from "@/lib/mutations";
import { todayInputValue } from "@/lib/format";
import type { Account, TxnKind } from "@/lib/types";

export interface EntryConfig {
  kind: TxnKind;
  title: string;
  subtitle: string;
  notePlaceholder: string;
  accountPickIds?: string[]; // choosable accounts (cash/gift)
  fixedAccountId?: string; // trade/investment always post here
  signMode: "toggle" | "positive" | "pnl";
  signLabels?: [string, string];
}

export function AccountEntrySheet({
  config,
  accounts,
  open,
  onClose,
  onSaved,
}: {
  config: EntryConfig | null;
  accounts: Account[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [sign, setSign] = useState(1);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if (!config) return null;

  const chosenAccount =
    config.fixedAccountId ?? accountId ?? config.accountPickIds?.[0] ?? accounts[0]?.id;
  const accountMeta = accounts.find((a) => a.id === chosenAccount);
  const numeric = parseFloat(amount || "0");

  function reset() {
    setAmount("");
    setAccountId(null);
    setSign(1);
    setNote("");
    setDate(todayInputValue());
  }

  async function submit() {
    if (!config || !numeric || numeric <= 0) return;
    setSaving(true);
    try {
      const signed = config.signMode === "positive" ? numeric : sign * numeric;
      await addAccountTransaction({
        accountId: chosenAccount,
        kind: config.kind,
        amount: signed,
        note,
        occurredAt: new Date(date + "T12:00:00").toISOString(),
      });
      toast(`${config.title} saved`);
      reset();
      onClose();
      onSaved();
    } catch {
      toast("Couldn't save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
      }}
      title={config.title}
      subtitle={config.subtitle}
    >
      <AmountDisplay value={amount} />
      <Keypad value={amount} onChange={setAmount} />

      {config.signMode !== "positive" && config.signLabels && (
        <div className="mt-4">
          <FieldLabel>{config.signMode === "pnl" ? "Result" : "Type"}</FieldLabel>
          <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)" }}>
            {config.signLabels.map((label, i) => {
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

      {config.accountPickIds && (
        <div className="mt-4">
          <FieldLabel>Account</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {config.accountPickIds.map((id) => {
              const a = accounts.find((x) => x.id === id);
              if (!a) return null;
              const active = chosenAccount === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccountId(id)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{
                    border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}`,
                    background: "var(--surface-2)",
                  }}
                >
                  <span className="text-[13px] font-bold truncate">{a.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {config.fixedAccountId && accountMeta && (
        <div className="mt-4">
          <FieldLabel>Account</FieldLabel>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div>
              <div className="text-[13.5px] font-bold">{accountMeta.name}</div>
              <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Always logged here
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <FieldLabel>Note {config.kind === "gift" ? "" : "(optional)"}</FieldLabel>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={config.notePlaceholder}
          className="w-full rounded-xl px-3.5 py-3 text-[14.5px] outline-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
        />
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

      <SubmitButton onClick={submit} disabled={!numeric || numeric <= 0 || saving}>
        {saving ? "Saving…" : config.title}
      </SubmitButton>
    </Sheet>
  );
}
