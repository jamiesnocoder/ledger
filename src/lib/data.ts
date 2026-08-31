import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getUsdToEurRate } from "@/lib/fx";
import type { Account, AccountTransaction, Expense, ExpenseCategory } from "@/lib/types";

export interface AppData {
  accounts: Account[];
  accountTransactions: AccountTransaction[];
  categories: ExpenseCategory[];
  expenses: Expense[];
  usdToEur: number;
}

// Single fetch used by every page's Server Component - small dataset for a
// single personal user, so no pagination yet.
export async function loadAppData(): Promise<AppData> {
  const supabase = await getSupabaseServerClient();

  const [accountsRes, txnsRes, categoriesRes, expensesRes, usdToEur] = await Promise.all([
    supabase.from("accounts").select("*").eq("archived", false).order("sort_order"),
    supabase
      .from("account_transactions")
      .select("*")
      .order("occurred_at", { ascending: true }),
    supabase
      .from("expense_categories")
      .select("*")
      .eq("archived", false)
      .order("sort_order"),
    supabase.from("expenses").select("*").order("occurred_at", { ascending: false }),
    getUsdToEurRate(),
  ]);

  return {
    accounts: (accountsRes.data as Account[]) ?? [],
    accountTransactions: (txnsRes.data as AccountTransaction[]) ?? [],
    categories: (categoriesRes.data as ExpenseCategory[]) ?? [],
    expenses: (expensesRes.data as Expense[]) ?? [],
    usdToEur,
  };
}
