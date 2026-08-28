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

export async function updateAccount(
  id: string,
  patch: Partial<{ name: string; color: string; sort_order: number; archived: boolean }>
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("accounts").update(patch).eq("id", id);
  if (error) throw error;
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
