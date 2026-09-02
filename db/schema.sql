-- Finance Tracker schema for Neon (Postgres)
-- Run this once against your Neon database (via Neon SQL Editor or `npm run db:setup`).

create extension if not exists "pgcrypto";

-- Members (people who use the app). Login is by unique username — there is no
-- public list of names, so the hierarchy is preserved: only someone who knows
-- the admin username can open the admin view.
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  name       text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  pin        text unique,
  created_at timestamptz not null default now()
);

-- Customers
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  address    text,
  added_by   uuid references members(id),
  created_at timestamptz not null default now()
);

-- Loans
create table if not exists loans (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references customers(id) on delete cascade,
  amount_given      numeric not null,
  interest_amount   numeric not null default 0,
  total_to_receive  numeric not null,
  tenure_days       integer not null,
  frequency         text not null check (frequency in ('daily','weekly','monthly','yearly')),
  installment_count integer not null,
  installment_amount numeric not null,
  start_date        date not null default current_date,
  status            text not null default 'active' check (status in ('active','closed')),
  created_by        uuid references members(id),
  created_at        timestamptz not null default now()
);

-- Entries (collections)
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references loans(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  member_id   uuid references members(id),
  amount      numeric not null,
  entry_date  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_loans_customer on loans(customer_id);
create index if not exists idx_entries_loan on entries(loan_id);
create index if not exists idx_entries_customer on entries(customer_id);
create index if not exists idx_entries_date on entries(entry_date);
create index if not exists idx_entries_member on entries(member_id);
