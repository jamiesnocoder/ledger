"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Account created — check your email to confirm, then sign in.");
        setMode("in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <span className="brand-mark w-8 h-8 rounded-lg shrink-0" />
          <Wordmark size={20} />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-[14.5px] outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-[14.5px] outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
          />

          {error && (
            <div className="text-[12.5px] font-bold" style={{ color: "var(--text)" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="text-[12.5px] font-medium" style={{ color: "var(--text-2)" }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 rounded-xl font-extrabold text-[14.5px] mt-1"
            style={{ background: "var(--ink)", color: "var(--ink-inverse)", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Please wait…" : mode === "in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
            setInfo(null);
          }}
          className="w-full text-center text-[13px] font-semibold mt-5"
          style={{ color: "var(--text-3)" }}
        >
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
