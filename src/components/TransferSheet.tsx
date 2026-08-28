"use client";

import { useState } from "react";
import { Sheet, FieldLabel, SubmitButton } from "@/components/Sheet";
import { AmountDisplay, Keypad } from "@/components/Keypad";
import { useToast } from "@/components/Toast";
import { logTransfer } from "@/lib/mutations";
import { fmtMoney, todayInputValue } from "@/lib/format";
import { Icon } from "@/components/icons";
import type { Account } from "@/lib/types";

export function TransferSheet({
  accounts,
  balances,
  open,
  onClose,
  onSaved,
}: {
  accounts: Account[];
  balances: Record<string, number>;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const numeric = parseFloat(amount || "0");

  function pickFrom(id: string) {
    setFrom(id);
    if (id === to) setTo(accounts.find((a) => a.id !== id)?.id ?? "");
  }

  async function submit() {
    if (!numeric || numeric <= 0 || from === to) return;
    setSaving(true);
    try {
      await logTransfer({
        from,
        to,
        amount: numeric,
        note,
        occurredAt: new Date(date + "T12:00:00").toISOString(),
      });
      toast(`Transferred ${fmtMoney(numeric)}`);
      setAmount("");
      setNote("");
      onClose();
      onSaved();
    } catch {
      toast("Couldn't save — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Transfer" subtitle="Move money between your own accounts — your total balance won't change.">
      <AmountDisplay value={amount} />
      <Keypad value={amount} onChange={setAmount} />

      <div className="mt-4">
        <FieldLabel>From</FieldLabel>
        <AccountGrid accounts={accounts} active={from} onPick={pickFrom} />
      </div>

      <div className="flex justify-center my-1">
        <button
          type="button"
          onClick={() => {
            const f = from;
            setFrom(to);
            setTo(f);
          }}
          aria-label="Swap"
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ border: "1px solid var(--border-strong)", color: "var(--text-2)" }}
        >
          <Icon.transfer size={15} />
        </button>
      </div>

      <div>
        <FieldLabel>To</FieldLabel>
        <AccountGrid accounts={accounts.filter((a) => a.id !== from)} active={to} onPick={setTo} />
      </div>

      <div className="mt-4">
        <FieldLabel>Note (optional)</FieldLabel>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Deposited cash at branch"
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

      <div className="text-[12px] mt-3" style={{ color: "var(--text-3)" }}>
        Available in {accounts.find((a) => a.id === from)?.name}: {fmtMoney(balances[from] ?? 0)}
      </div>

      <SubmitButton onClick={submit} disabled={!numeric || numeric <= 0 || from === to || saving}>
        {saving ? "Saving…" : "Transfer"}
      </SubmitButton>
    </Sheet>
  );
}

function AccountGrid({
  accounts,
  active,
  onPick,
}: {
  accounts: Account[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {accounts.map((a) => {
        const isActive = active === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a.id)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ border: `1px solid ${isActive ? "var(--ink)" : "var(--border-strong)"}`, background: "var(--surface-2)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
            <span className="text-[13px] font-bold truncate">{a.name}</span>
          </button>
        );
      })}
    </div>
  );
}
