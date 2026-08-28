"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="fixed left-1/2 z-[60] px-4 py-2.5 rounded-full text-[12.5px] font-semibold pointer-events-none max-w-[88%] text-center"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          transform: `translate(-50%, ${msg ? "0" : "8px"})`,
          background: "var(--ink)",
          color: "var(--ink-inverse)",
          opacity: msg ? 1 : 0,
          transition: "opacity .2s, transform .2s",
        }}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
