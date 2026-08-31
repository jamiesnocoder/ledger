// Hand-written types matching supabase/schema.sql. (For a generated version
// later: `supabase gen types typescript --project-id <id>`.)

export type AccountId = "cash" | "bank" | "investment" | "daytrading";

export type TxnKind =
  | "cash"
  | "gift"
  | "trade"
  | "investment"
  | "transfer_out"
  | "transfer_in"
  | "adjustment"
  | "expense";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  archived: boolean;
  starting_balance: number;
  created_at: string;
}

export interface AccountTransaction {
  id: string;
  user_id: string;
  account_id: string;
  kind: TxnKind;
  amount: number;
  note: string | null;
  occurred_at: string;
  transfer_id: string | null;
  expense_id: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  account_id: string | null;
  title: string;
  amount: number;
  payment_label: string | null;
  occurred_at: string;
  created_at: string;
}

// Minimal Database type so @supabase/ssr's generics are satisfied without
// pulling in the full generated schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
