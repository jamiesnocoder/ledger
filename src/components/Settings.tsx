"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, CATEGORY_ICON_KEYS } from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { computeBalances } from "@/lib/compute";
import { fmtMoney } from "@/lib/format";
import { updateAccount, addAccount, archiveAccount, addCategory, updateCategory, signOut } from "@/lib/mutations";
import { useToast } from "@/components/Toast";
import type { AppData } from "@/lib/data";
import type { Currency } from "@/lib/types";

export function Settings({ data }: { data: AppData }) {
  const router = useRouter();
  const toast = useToast();
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>("tag");
  const [addingCategory, setAddingCategory] = useState(false);

  const { byAccount } = computeBalances(data.accounts, data.accountTransactions, data.usdToEur);

  function refresh() {
    router.refresh();
  }

  async function saveAccount(id: string, name: string, startingBalance: number, currency: Currency) {
    try {
      await updateAccount(id, { name, starting_balance: startingBalance, currency });
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
      await addCategory(newCategory.trim(), newCategoryIcon, data.categories.length);
      toast("Category added");
      setNewCategory("");
      setNewCategoryIcon("tag");
      setAddingCategory(false);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function saveCategory(id: string, name: string, icon: string) {
    try {
      await updateCategory(id, { name, icon });
      toast("Category updated");
      setEditingCategory(null);
      refresh();
    } catch {
      toast("Couldn't save — try again");
    }
  }

  async function archiveCategory(id: string) {
    try {
      await updateCategory(id, { archived: true });
      toast("Category removed");
      setEditingCategory(null);
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
                currency={a.currency ?? "EUR"}
                editing={editingAccount === a.id}
                onEdit={() => setEditingAccount(a.id)}
                onCancel={() => setEditingAccount(null)}
                onSave={saveAccount}
                onRemove={removeAccount}
              />
            ))}
          </div>
          <div className="text-[12px] mt-2.5" style={{ color: "var(--text-3)" }}>
            Starting balance is the amount this account held before you started tracking it here — balances and trend graphs count up from it instead of zero. USD accounts are converted to EUR for the Net Worth total using the current exchange rate.
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
            {data.categories.map((c) => (
              <CategoryRow
                key={c.id}
                id={c.id}
                name={c.name}
                icon={c.icon}
                editing={editingCategory === c.id}
                onEdit={() => setEditingCategory(c.id)}
                onCancel={() => setEditingCategory(null)}
                onSave={saveCategory}
                onRemove={archiveCategory}
              />
            ))}
          </div>

          {addingCategory ? (
            <div className="rounded-xl px-3.5 py-3 mt-2.5" style={{ border: "1px solid var(--ink)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
              <input
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Category name"
                className="w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mb-2"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
              />
              <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                Icon
              </label>
              <IconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAddingCategory(false);
                    setNewCategory("");
                    setNewCategoryIcon("tag");
                  }}
                  className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
                  style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="flex-1 py-2 rounded-lg font-bold text-[12.5px]"
                  style={{ background: "var(--ink)", color: "var(--ink-inverse)" }}
                >
                  Add
                </button>
              </div>
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

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 mt-1 mb-3">
      {CATEGORY_ICON_KEYS.map((key) => {
        const IconComp = Icon[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            aria-pressed={selected}
            className="aspect-square rounded-lg flex items-center justify-center"
            style={{
              background: selected ? "var(--ink)" : "var(--surface-2)",
              color: selected ? "var(--ink-inverse)" : "var(--text-2)",
            }}
          >
            <IconComp size={15} />
          </button>
        );
      })}
    </div>
  );
}

function CategoryRow({
  id,
  name,
  icon,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  id: string;
  name: string;
  icon: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, icon: string) => void;
  onRemove: (id: string) => void;
}) {
  const [localName, setLocalName] = useState(name);
  const [localIcon, setLocalIcon] = useState(icon);
  const IconComp = Icon[icon as keyof typeof Icon] ?? Icon.tag;

  if (!editing) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow)" }}
      >
        <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98]" style={{ transition: "transform .1s" }}>
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <IconComp size={15} />
          </span>
          <span className="text-[13.5px] font-semibold truncate">{name}</span>
        </button>
        <button
          onClick={() => onRemove(id)}
          aria-label={`Remove ${name}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ color: "var(--text-3)" }}
        >
          <Icon.trash size={14} />
        </button>
      </div>
    );
  }

  function submit() {
    onSave(id, localName.trim() || name, localIcon);
  }

  return (
    <div className="rounded-xl px-3.5 py-3" style={{ border: "1px solid var(--ink)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
      <input
        autoFocus
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mb-2"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />
      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
        Icon
      </label>
      <IconPicker value={localIcon} onChange={setLocalIcon} />
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
    </div>
  );
}

function AccountRow({
  id,
  name,
  startingBalance,
  currency,
  editing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: {
  id: string;
  name: string;
  startingBalance: number;
  currency: Currency;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, startingBalance: number, currency: Currency) => void;
  onRemove: (id: string) => void;
}) {
  const [localName, setLocalName] = useState(name);
  const [localBalance, setLocalBalance] = useState(String(startingBalance));
  const [localCurrency, setLocalCurrency] = useState<Currency>(currency);
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
          {fmtMoney(startingBalance, currency)}
        </span>
      </button>
    );
  }

  function submit() {
    const parsed = Number.parseFloat(localBalance.replace(",", "."));
    onSave(id, localName.trim() || name, Number.isFinite(parsed) ? parsed : startingBalance, localCurrency);
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
        className="num w-full rounded-lg px-3 py-2 text-[13.5px] font-semibold outline-none mt-1 mb-2"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-strong)", color: "var(--text)" }}
      />
      <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
        Currency
      </label>
      <div className="flex rounded-lg p-0.5 gap-0.5 mt-1 mb-3" style={{ background: "var(--surface-2)" }}>
        {(["EUR", "USD"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setLocalCurrency(c)}
            className="flex-1 py-1.5 rounded-md text-[12px] font-bold"
            style={{
              background: localCurrency === c ? "var(--surface)" : "transparent",
              color: localCurrency === c ? "var(--text)" : "var(--text-3)",
            }}
          >
            {c}
          </button>
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
