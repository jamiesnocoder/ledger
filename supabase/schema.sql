-- Ledger schema: net worth accounts + expense tracking, single-user, RLS-locked.
-- Run this once against a fresh Supabase project (SQL Editor, or via the
-- Supabase MCP connector's migration tool).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- accounts: balance buckets. New users are seeded with 4 defaults (Cash,
-- Bank, Investment, Day Trading), but the set isn't fixed - users can
-- rename, add, or archive accounts freely from Settings. "daytrading" and
-- "investment" stay special-cased by id in the app (dedicated P&L entry
-- flows) when they exist; everything else is a plain pickable balance.
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  sort_order int not null default 0,
  archived boolean not null default false,
  -- Balance carried in from before this account was tracked here - balances
  -- and history both start from this instead of zero.
  starting_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- account_transactions: append-only ledger. Every account balance is the
-- sum of its rows here - no separate "balance" column to drift out of sync.
-- ---------------------------------------------------------------------------
create table if not exists account_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id text not null,
  kind text not null check (kind in ('cash', 'gift', 'trade', 'investment', 'transfer_out', 'transfer_in', 'adjustment', 'expense')),
  amount numeric(14, 2) not null,
  note text,
  occurred_at timestamptz not null default now(),
  transfer_id uuid,
  expense_id uuid,
  created_at timestamptz not null default now(),
  foreign key (user_id, account_id) references accounts (user_id, id)
);

create index if not exists account_transactions_user_account_idx
  on account_transactions (user_id, account_id, occurred_at);

-- ---------------------------------------------------------------------------
-- expense_categories
-- ---------------------------------------------------------------------------
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'tag',
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- expenses: a spend, optionally debited from a real account (payment method).
-- ---------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references expense_categories (id) on delete set null,
  account_id text,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_label text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, account_id) references accounts (user_id, id)
);

create index if not exists expenses_user_occurred_idx on expenses (user_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Row Level Security - every table scoped to auth.uid() = user_id.
-- ---------------------------------------------------------------------------
alter table accounts enable row level security;
alter table account_transactions enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;

create policy "own accounts" on accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own account_transactions" on account_transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expense_categories" on expense_categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expenses" on expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RPCs: atomic writes for multi-row operations, run as the calling user
-- (security invoker) so RLS still applies - these just guarantee both rows
-- land together or not at all.
-- ---------------------------------------------------------------------------

create or replace function log_transfer(
  p_from_account text,
  p_to_account text,
  p_amount numeric,
  p_note text default null,
  p_occurred_at timestamptz default now()
) returns void
language plpgsql
security invoker
as $$
declare
  v_transfer_id uuid := gen_random_uuid();
  v_user uuid := auth.uid();
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into account_transactions (user_id, account_id, kind, amount, note, occurred_at, transfer_id)
  values (v_user, p_from_account, 'transfer_out', -p_amount, p_note, p_occurred_at, v_transfer_id);

  insert into account_transactions (user_id, account_id, kind, amount, note, occurred_at, transfer_id)
  values (v_user, p_to_account, 'transfer_in', p_amount, p_note, p_occurred_at + interval '1 millisecond', v_transfer_id);
end;
$$;

create or replace function log_expense(
  p_title text,
  p_amount numeric,
  p_category_id uuid default null,
  p_account_id text default null,
  p_payment_label text default null,
  p_occurred_at timestamptz default now()
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_expense_id uuid := gen_random_uuid();
  v_user uuid := auth.uid();
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  insert into expenses (id, user_id, category_id, account_id, title, amount, payment_label, occurred_at)
  values (v_expense_id, v_user, p_category_id, p_account_id, p_title, p_amount, p_payment_label, p_occurred_at);

  if p_account_id is not null then
    insert into account_transactions (user_id, account_id, kind, amount, note, occurred_at, expense_id)
    values (v_user, p_account_id, 'expense', -p_amount, p_title, p_occurred_at, v_expense_id);
  end if;

  return v_expense_id;
end;
$$;

create or replace function delete_expense(p_expense_id uuid) returns void
language plpgsql
security invoker
as $$
begin
  delete from account_transactions where expense_id = p_expense_id and user_id = auth.uid();
  delete from expenses where id = p_expense_id and user_id = auth.uid();
end;
$$;

create or replace function delete_transfer(p_transfer_id uuid) returns void
language plpgsql
security invoker
as $$
begin
  delete from account_transactions where transfer_id = p_transfer_id and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed default accounts + categories for a newly-signed-up user.
-- ---------------------------------------------------------------------------
create or replace function seed_defaults_for_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into accounts (id, user_id, name, color, sort_order) values
    ('cash', new.id, 'Cash', '#0a0a09', 0),
    ('bank', new.id, 'Bank Account', '#454340', 1),
    ('investment', new.id, 'Investment', '#726f6a', 2),
    ('daytrading', new.id, 'Day Trading', '#a9a7a0', 3)
  on conflict do nothing;

  insert into expense_categories (user_id, name, icon, sort_order) values
    (new.id, 'Food & Drinks', 'food', 0),
    (new.id, 'Shopping', 'bag', 1),
    (new.id, 'Travel', 'plane', 2),
    (new.id, 'Services', 'wrench', 3),
    (new.id, 'Entertainment', 'film', 4),
    (new.id, 'Health', 'heart', 5)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function seed_defaults_for_user();
