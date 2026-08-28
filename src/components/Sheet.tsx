"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons";

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // Drive mount/visible entirely from this single effect, keyed on `open`.
  // (A previous version tried to flip `mounted` during render - comparing
  // `open` to a `prevOpen` state - to avoid an extra commit. That pattern
  // breaks under React Strict Mode's double-render-for-purity check: the
  // render-phase update could get applied against a stale intermediate
  // pass and `mounted` would bounce back to false right after being set,
  // so the sheet never actually mounted into the DOM. Doing it here in an
  // effect is one commit slower but is not order-dependent on how many
  // times React chooses to invoke the render function.)
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- must mount before the enter transition (rAF below) can run against a real DOM node.
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 240);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        background: "rgba(6,6,5,0.5)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transition: "opacity .2s",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[480px] rounded-t-[22px] px-5 max-h-[88dvh] overflow-y-auto"
        style={{
          background: "var(--surface)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
          paddingTop: 10,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .28s cubic-bezier(.32,.72,0,1)",
        }}
      >
        <div
          className="w-9 h-1 rounded-full mx-auto mb-3.5"
          style={{ background: "var(--border-strong)" }}
        />
        <div className="flex items-start justify-between mb-1">
          <div className="text-[17px] font-extrabold tracking-tight">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl flex items-center justify-center -mr-1.5"
            style={{ color: "var(--text-2)" }}
          >
            <Icon.close size={18} />
          </button>
        </div>
        {subtitle && (
          <div className="text-[12.5px] mb-4.5" style={{ color: "var(--text-3)" }}>
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11.5px] font-bold uppercase tracking-wide mb-2"
      style={{ color: "var(--text-2)" }}
    >
      {children}
    </div>
  );
}

export function SubmitButton({
  children,
  onClick,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-2xl font-extrabold text-[14.5px] mt-1 active:scale-[0.98]"
      style={{
        background: "var(--ink)",
        color: "var(--ink-inverse)",
        opacity: disabled ? 0.4 : 1,
        transition: "transform .1s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
