"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { computeBalances } from "@/lib/compute";
import { fmtMoney } from "@/lib/format";
import { updateAccount, addCategory, updateCategory, signOut } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { AppData } from "@/lib/data";

const SWATCHES = ["#0a0a09", "#2b2a28", "#454340", "#5c5b57", "#726f6a", "#918f89", "#b6b4ad", "#d8d6cf"];

export function Settings({ data }: { data: AppData }) {
  const router = useRouter();
  const toast = useToast();
  const { byAccount } = computeBalances(data.accounts, data.accountTransactions);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function saveAccount(id: string, name: string, color: string) {
    try {
      await updateAccount(id, { name, color });
      toast("Account updated");
      setEditingAccount(null);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    try {
      await addCategory(newCategory.trim(), "tag", data.categories.length);
      toast("Category added");
      setNewCategory("");
      setAddingCategory(false);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function archiveCategory(id: string) {
    try {
      await updateCategory(id, { archived: true });
      toast("Category removed");
      refresh();
    } catch {
      toast("Couldn't remove — try again");
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh]">
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: 12,
          background: "linear-gradient(var(--bg) 70%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Back"
            className="w-9 h-9 rounded-xl border flex items-center justify-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
          >
            <Icon.chevronLeft size={17} />
          </Link>
          <div className="text-[17px] font-extrabold tracking-tight">Settings</div>
        </div>
      </header>

      <main className="px-5 pb-16">
        <Section title="Accounts & starting balances">
          <div className="flex flex-col gap-2">
            {data.accounts.map((a) => (
              <AccountRow
                key={a.id}
                id={a.id}
                name={a.name}
                color={a.color}
                balance={byAccount[a.id] ?? 0}
                editing={editingAccount === a.id}
                onEdit={() => setEditingAccount(a.id)}
                onCancel={() => setEditingAccount(null)}
                onSave={saveAccount}
              />
            ))}
          </div>
          <div className="text-[12px] mt-2.5" style={{ color: "var(--text-3)" }}>
            To set a starting balance, use the + button on that account&apos;s card on the main page.
          </div>
        </Section>

        <Section title="Expense categories">
          <div className="flex flex-col gap-2">
            {data.categories.map((c) => {
              const IconComp = Icon[c.icon as keyof typeof Icon] ?? Icon.tag;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                  >
                    <IconComp size={15} />
                  </span>
                  <span className="text-[13.5px] font-semibold flex-1">{c.name}</span>
                  <button
                    onClick={() => archiveCategory(c.id)}
                    aria-label={`Remove ${c.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ color: "var(--text-3)" }}
                  >
                    <Icon.trash size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {addingCategory ? (
            <div className="flex gap-2 mt-2.5">
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Category name"
                className="flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 rounded-xl font-bold text-[13px]"
                style={{ background: "var(--ink)", color: "var(--ink-inverse)" }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="w-full mt-2.5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5"
              style={{ border: "1px dashed var(--border-strong)", color: "var(--text-2)" }}
            >
              <Icon.plus size={14} /> Add category
            </button>
          )}
        </Section>

        <Section title="Appearance">
          <div className="flex items-center justify-between rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <span className="text-[13.5px] font-semibold">Theme</span>
            <ThemeToggle />
          </div>
        </Section>

        <Section title="Account">
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl font-bold text-[13.5px]"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            Sign out
          </button>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-2">
      <div className="text-[12.5px] font-bold uppercase tracking-wide mb-2.5" style={{ color: "var(--text-3)" }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function AccountRow({
  id,
  name,
  color,
  balance,
  editing,
  onEdit,
  onCancel,
  onSave,
}: {
  id: string;
  name: string;
  color: string;
  balance: number;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, color: string) => void;
}) {
  const [localName, setLocalName] = useState(name);
  const [localColor, setLocalColor] = useState(color);

  if (!editing) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left"
        style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[13.5px] font-semibold flex-1">{name}</span>
        <span className="num text-[13.5px] font-semibold" style={{ color: "var(--text-2)" }}>
          {fmtMoney(balance)}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
      <input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mb-2.5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />
      <div className="flex gap-1.5 mb-3">
        {SWATCHES.map((sw) => (
          <button
            key={sw}
            onClick={() => setLocalColor(sw)}
            aria-label={sw}
            className="w-6 h-6 rounded-full shrink-0"
            style={{ background: sw, outline: localColor === sw ? "2px solid var(--text)" : "none", outlineOffset: 2 }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(id, localName.trim() || name, localColor)}
          className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
          style={{ background: "var(--ink)", color: "var(--ink-inverse)" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
