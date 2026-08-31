"use client";

import { Icon } from "@/components/icons";
import { fmtRelative, fmtSigned, fmtMoney } from "@/lib/format";

export interface FeedItem {
  id: string;
  title: string;
  meta: string;
  amount: number; // signed for account txns, positive magnitude for expenses
  signed: boolean; // whether to render +/- coloring
  ts: string;
  iconKey: keyof typeof Icon;
  colorVar: string;
}

export function ActivityList({
  items,
  emptyTitle = "No activity yet",
  emptyHint,
}: {
  items: FeedItem[];
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-9 px-3.5" style={{ color: "var(--text-3)" }}>
        <div className="mx-auto mb-2.5 opacity-60">
          <Icon.wallet size={26} />
        </div>
        <div className="text-[13.5px] font-bold mb-0.5" style={{ color: "var(--text-2)" }}>
          {emptyTitle}
        </div>
        {emptyHint && <div className="text-[13px]">{emptyHint}</div>}
      </div>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

export function ActivityRow({
  item,
  onClick,
  divider = false,
}: {
  item: FeedItem;
  onClick?: () => void;
  divider?: boolean;
}) {
  const IconComp = Icon[item.iconKey] ?? Icon.tag;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-[var(--surface-2)]"
      style={{ borderBottom: divider ? "1px solid var(--border)" : "none", transition: "background-color .1s" }}
    >
      <div
        className="w-[34px] h-[34px] rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, var(${item.colorVar}) 16%, transparent)`, color: `var(${item.colorVar})` }}
      >
        <IconComp size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold truncate">{item.title}</div>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>
          {item.meta} · {fmtRelative(item.ts)}
        </div>
      </div>
      <div className="num text-[14px] font-semibold shrink-0" style={{ color: "var(--text)" }}>
        {item.signed ? fmtSigned(item.amount) : fmtMoney(item.amount)}
      </div>
    </button>
  );
}
