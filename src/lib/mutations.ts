"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AccountId, TxnKind } from "@/lib/types";

export async function addAccountTransaction(args: {
  accountId: AccountId | string;
  kind: TxnKind;
  amount: number;
  note?: string;
  occurredAt?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("account_transactions").insert({
    user_id: user.id,
    account_id: args.accountId,
    kind: args.kind,
    amount: args.amount,
    note: args.note || null,
    occurred_at: args.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteAccountTransaction(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("account_transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAccountTransaction(
  id: string,
  patch: { accountId?: AccountId | string; amount: number; note?: string; occurredAt: string }
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("account_transactions")
    .update({
      account_id: patch.accountId,
      amount: patch.amount,
      note: patch.note || null,
      occurred_at: patch.occurredAt,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function logTransfer(args: {
  from: AccountId | string;
  to: AccountId | string;
  amount: number;
  note?: string;
  occurredAt?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("log_transfer", {
    p_from_account: args.from,
    p_to_account: args.to,
    p_amount: args.amount,
    p_note: args.note || null,
    p_occurred_at: args.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteTransfer(transferId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_transfer", { p_transfer_id: transferId });
  if (error) throw error;
}

// Transfers are two linked rows (transfer_out/transfer_in) sharing a
// transfer_id - keep them in sync by updating both sides together.
export async function updateTransfer(transferId: string, args: { amount: number; note?: string; occurredAt: string }) {
  const supabase = getSupabaseBrowserClient();
  const { error: outErr } = await supabase
    .from("account_transactions")
    .update({ amount: -Math.abs(args.amount), note: args.note || null, occurred_at: args.occurredAt })
    .eq("transfer_id", transferId)
    .eq("kind", "transfer_out");
  if (outErr) throw outErr;

  const { error: inErr } = await supabase
    .from("account_transactions")
    .update({ amount: Math.abs(args.amount), note: args.note || null, occurred_at: args.occurredAt })
    .eq("transfer_id", transferId)
    .eq("kind", "transfer_in");
  if (inErr) throw inErr;
}

export async function logExpense(args: {
  title: string;
  amount: number;
  categoryId?: string | null;
  accountId?: AccountId | string | null;
  paymentLabel?: string;
  occurredAt?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("log_expense", {
    p_title: args.title,
    p_amount: args.amount,
    p_category_id: args.categoryId || null,
    p_account_id: args.accountId || null,
    p_payment_label: args.paymentLabel || null,
    p_occurred_at: args.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteExpense(expenseId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("delete_expense", { p_expense_id: expenseId });
  if (error) throw error;
}

// Updates an expense and re-syncs its linked ledger row (if any) rather than
// trying to diff it - simplest way to handle the payment account changing
// (including to/from "Untracked") without drifting out of sync.
export async function updateExpenseEntry(
  expenseId: string,
  args: { title: string; amount: number; categoryId: string | null; accountId: AccountId | string | null; occurredAt: string }
) {
  const supabase = getSupabaseBrowserClient();
  const { error: expErr } = await supabase
    .from("expenses")
    .update({
      title: args.title,
      amount: args.amount,
      category_id: args.categoryId,
      account_id: args.accountId,
      occurred_at: args.occurredAt,
    })
    .eq("id", expenseId);
  if (expErr) throw expErr;

  const { error: delErr } = await supabase.from("account_transactions").delete().eq("expense_id", expenseId);
  if (delErr) throw delErr;

  if (args.accountId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error: insErr } = await supabase.from("account_transactions").insert({
      user_id: user.id,
      account_id: args.accountId,
      kind: "expense",
      amount: -args.amount,
      note: args.title,
      occurred_at: args.occurredAt,
      expense_id: expenseId,
    });
    if (insErr) throw insErr;
  }
}

export async function updateAccount(
  id: string,
  patch: Partial<{ name: string; color: string; sort_order: number; archived: boolean; starting_balance: number }>
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error) throw error;
}

// New accounts get a random id (accounts.id is just a text primary key, not
// tied to any fixed set) so users who don't trade can add whatever buckets
// make sense for them (Savings, Credit Card, etc).
export async function addAccount(name: string, sortOrder: number) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("accounts")
    .insert({ id, user_id: user.id, name, color: "#000000", sort_order: sortOrder, starting_balance: 0 });
  if (error) throw error;
}

export async function archiveAccount(id: string) {
  return updateAccount(id, { archived: true });
}

export async function addCategory(name: string, icon: string, sortOrder: number) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("expense_categories")
    .insert({ user_id: user.id, name, icon, sort_order: sortOrder });
  if (error) throw error;
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; icon: string; sort_order: number; archived: boolean }>
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("expense_categories").update(patch).eq("id", id);
  if (error) throw error;
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
