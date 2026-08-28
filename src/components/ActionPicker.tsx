"use client";

import { Sheet } from "@/components/Sheet";
import { Icon } from "@/components/icons";

export type ActionKey = "cash" | "gift" | "trade" | "investment" | "transfer" | "expense";

const ACTIONS: { key: ActionKey; label: string; sub: string; icon: keyof typeof Icon; colorVar: string }[] = [
  { key: "expense", label: "Add Expense", sub: "Something you spent", icon: "bag", colorVar: "--text" },
  { key: "cash", label: "Add Cash", sub: "Deposit or withdraw", icon: "cash", colorVar: "--acc-cash" },
  { key: "gift", label: "Add Gift", sub: "Money received", icon: "gift", colorVar: "--acc-bank" },
  { key: "trade", label: "Add Trade", sub: "Day Trading P&L", icon: "trade", colorVar: "--acc-daytrading" },
  { key: "investment", label: "Add Investment", sub: "Investment P&L", icon: "invest", colorVar: "--acc-investment" },
  { key: "transfer", label: "Transfer", sub: "Between your accounts", icon: "transfer", colorVar: "--text" },
];

export function ActionPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (key: ActionKey) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Add">
      <div className="flex flex-col gap-2">
        {ACTIONS.map((a) => {
          const IconComp = Icon[a.icon];
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => onPick(a.key)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, var(${a.colorVar}) 16%, transparent)`, color: `var(${a.colorVar})` }}
              >
                <IconComp size={19} />
              </span>
              <span className="text-left">
                <div className="text-[13.5px] font-bold">{a.label}</div>
                <div className="text-[11.5px]" style={{ color: "var(--text-3)" }}>
                  {a.sub}
                </div>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
