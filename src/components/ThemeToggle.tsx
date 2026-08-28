"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

function effectiveTheme(): "light" | "dark" {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("ledger-theme");
  } catch {}
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Reads localStorage/matchMedia, which don't exist during SSR - this
    // has to run post-mount, so it can't move to a render-time computation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(effectiveTheme());
  }, []);

  function toggle() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("ledger-theme", next);
    } catch {}
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
      style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
    >
      {theme === "dark" ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}
