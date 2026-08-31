"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { computeBalances } from "@/lib/compute";
import { fmtMoney } from "@/lib/format";
import { updateAccount, addAccount, archiveAccount, addCategory, updateCategory, signOut } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { AppData } from "@/lib/data";

export function Settings({ data }: { data: AppData }) {
  const router = useRouter();
  const toast = useToast();
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const { byAccount } = computeBalances(data.accounts, data.accountTransactions);

  function refresh() {
    router.refresh();
  }

  async function saveAccount(id: string, name: string, startingBalance: number) {
    try {
      await updateAccount(id, { name, starting_balance: startingBalance });
      toast("Account updated");
      setEditingAccount(null);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function handleAddAccount() {
    if (!newAccountName.trim()) return;
    try {
      await addAccount(newAccountName.trim(), data.accounts.length);
      toast("Account added");
      setNewAccountName("");
      setAddingAccount(false);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function removeAccount(id: string) {
    if (Math.abs(byAccount[id] ?? 0) > 0.005) {
      toast("Move its balance to another account first");
      return;
    }
    try {
      await archiveAccount(id);
      toast("Account removed");
      setEditingAccount(null);
      refresh();
    } catch {
      toast("Couldn't remove — try again");
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
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95"
            style={{ background: "var(--surface)", color: "var(--text-2)", boxShadow: "var(--shadow)", transition: "transform .1s" }}
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
                startingBalance={a.starting_balance ?? 0}
                editing={editingAccount === a.id}
                onEdit={() => setEditingAccount(a.id)}
                onCancel={() => setEditingAccount(null)}
                onSave={saveAccount}
                onRemove={removeAccount}
              />
            ))}
          </div>
          <div className="text-[12px] mt-2.5" style={{ color: "var(--text-3)" }}>
            Starting balance is the amount this account held before you started tracking it here — balances and trend graphs count up from it instead of zero.
          </div>

          {addingAccount ? (
            <div className="flex gap-2 mt-2.5">
              <input
                autoFocus
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                placeholder="Account name, e.g. Savings"
                className="flex-1 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
              />
              <button
                onClick={handleAddAccount}
                className="px-4 rounded-xl font-bold text-[13px]"
                style={{ background: "var(--ink)", color: "var(--ink-inverse)" }}
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingAccount(true)}
              className="w-full mt-2.5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5"
              style={{ border: "1px dashed var(--border-strong)", color: "var(--text-2)" }}
            >
              <Icon.plus size={14} /> Add account
            </button>
          )}
        </Section>

        <Section title="Expense categories">
          <div className="flex flex-col gap-2">
            {data.categories.map((c) => {
              const IconComp = Icon[c.icon as keyof typeof Icon] ?? Icon.tag;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
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
          <div className="flex items-center justify-between rounded-xl px-3.5 py-3" style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}>
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
  startingBalance,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  id: string;
  name: string;
  startingBalance: number;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, startingBalance: number) => void;
  onRemove: (id: string) => void;
}) {
  const [localName, setLocalName] = useState(name);
  const [localBalance, setLocalBalance] = useState(String(startingBalance));
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left active:scale-[0.98]"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow)", transition: "transform .1s" }}
      >
        <span className="text-[13.5px] font-semibold">{name}</span>
        <span className="num text-[13.5px] font-semibold" style={{ color: "var(--text-2)" }}>
          {fmtMoney(startingBalance)}
        </span>
      </button>
    );
  }

  function submit() {
    const parsed = Number.parseFloat(localBalance.replace(",", "."));
    onSave(id, localName.trim() || name, Number.isFinite(parsed) ? parsed : startingBalance);
  }

  return (
    <div className="rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--ink)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
      <input
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mb-2"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />
      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
        Starting balance
      </label>
      <input
        value={localBalance}
        onChange={(e) => setLocalBalance(e.target.value)}
        inputMode="decimal"
        className="num w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mt-1 mb-3"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
          style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
          style={{ background: "var(--ink)", color: "var(--ink-inverse)" }}
        >
          Save
        </button>
      </div>
      <button
        onClick={() => (confirmingRemove ? onRemove(id) : setConfirmingRemove(true))}
        className="w-full py-2 rounded-lg font-bold text-[12.5px] mt-2 flex items-center justify-center gap-1.5"
        style={{
          background: confirmingRemove ? "var(--ink)" : "transparent",
          color: confirmingRemove ? "var(--ink-inverse)" : "var(--text-3)",
        }}
      >
        {confirmingRemove ? <Icon.check size={13} /> : <Icon.trash size={13} />}
        {confirmingRemove ? "Tap again to confirm" : "Remove account"}
      </button>
    </div>
  );
}
