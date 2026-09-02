# How to move to a fresh database (when the old one is full)

You can do this yourself, no coding needed. It takes ~10 minutes. Your old data
stays safe in the backup PDF.

**Do this only when the storage bar (⋮ menu in the app) is near full — years away.**

---

## STEP 1 — Save a backup first (important)
1. Open the app, log in as admin (Sailesh).
2. Go to **Summary** tab → tap **Download ALL data (backup PDF)**.
3. Keep that PDF safe (email it to yourself). This is your permanent record.

---

## STEP 2 — Create a new free Neon database
1. Go to **https://neon.tech** and log in.
2. Click **New Project** → give any name → **Create**.
3. On the project page click **Connect** → copy the **connection string**
   (the pooled one, it looks like:
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`).
   Keep this text — you'll paste it twice below.

---

## STEP 3 — Create the tables in the new database
1. In the Neon project, open the **SQL Editor** (left menu).
2. **Copy everything** in the grey box below and paste it into the editor, then
   click **Run**. (This creates the empty tables + your logins.)

```sql
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  name text not null,
  role text not null default 'member' check (role in ('admin','member')),
  pin text unique,
  created_at timestamptz not null default now()
);
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text, address text,
  added_by uuid references members(id),
  created_at timestamptz not null default now()
);
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount_given numeric not null, interest_amount numeric not null default 0,
  total_to_receive numeric not null, tenure_days integer not null,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  installment_count integer not null, installment_amount numeric not null,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active','closed')),
  created_by uuid references members(id),
  created_at timestamptz not null default now()
);
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  member_id uuid references members(id),
  amount numeric not null, entry_date date not null default current_date,
  note text, created_at timestamptz not null default now()
);
create index if not exists idx_loans_customer on loans(customer_id);
create index if not exists idx_entries_loan on entries(loan_id);
create index if not exists idx_entries_customer on entries(customer_id);
create index if not exists idx_entries_date on entries(entry_date);
create index if not exists idx_entries_member on entries(member_id);

-- Your logins (edit names/PINs here if needed; PINs must be different):
insert into members (username, name, role, pin) values
  ('sailesh', 'Sailesh', 'admin', '2904'),
  ('sarath',  'Sarath',  'member', '0000')
on conflict (username) do nothing;
```

> Add more people by adding more lines before the `on conflict` line, e.g.
> `('ravi', 'Ravi', 'member', '1111'),`

---

## STEP 4 — Point the app at the new database (in Vercel)
1. Go to **https://vercel.com** and log in.
2. Open the **finance-tracker** project → **Settings** → **Environment Variables**.
3. Find **DATABASE_URL** → click **Edit** → delete the old value → paste your
   **new** Neon connection string from Step 2 → **Save**.

---

## STEP 5 — Restart the app so it uses the new database
1. Still in Vercel, go to the **Deployments** tab.
2. On the newest deployment, click the **⋯** (three dots) → **Redeploy** →
   confirm **Redeploy**.
3. Wait ~1 minute for it to finish.

---

## STEP 6 — Check it works
1. Open the app: **https://finance-tracker-chi-ruddy-55.vercel.app**
2. Log in with your PIN (Sailesh 2904).
3. It will be **empty and fresh** — start adding customers again.

Done. The old data lives on in your backup PDF; the app now has a full, empty
database again (another ~15 years). You can repeat this anytime, for free.

---

### If something looks wrong
- App shows an error after the switch → the connection string was likely pasted
  with a missing character. Re-copy it from Neon (Step 2) and redo Steps 4–5.
- Login says "Wrong PIN" → the Step 3 SQL didn't run. Re-run it in the Neon SQL
  Editor.
