"use client";

import { Icon } from "@/components/icons";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

export function Keypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  function press(key: string) {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    if (value.replace(".", "").length >= 8) return; // sane upper bound
    if (key === "." && value === "") {
      onChange("0.");
      return;
    }
    onChange(value === "0" ? key : value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className="h-14 rounded-2xl flex items-center justify-center text-[20px] font-semibold num active:scale-95"
          style={{ background: "var(--surface-2)", color: "var(--text)", transition: "transform .08s" }}
          aria-label={k === "back" ? "Delete" : k}
        >
          {k === "back" ? <Icon.backspace size={20} /> : k}
        </button>
      ))}
    </div>
  );
}

export function AmountDisplay({ value }: { value: string }) {
  const display = value === "" ? "0" : value;
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <span className="text-[30px] font-semibold num" style={{ color: "var(--text-3)" }}>
        €
      </span>
      <span className="text-[46px] font-extrabold num tracking-tight" style={{ letterSpacing: "-0.02em" }}>
        {display}
      </span>
    </div>
  );
}
