# Finance Tracker

Installable PWA for an informal money-lending business. Admin (father) lends
money; employees collect daily/weekly/monthly/yearly installments. No login —
simple name-select. Works "Add to Home Screen" on Android Chrome and iPhone
Safari.

**Stack:** React + Vite + Tailwind + `vite-plugin-pwa`, **Neon** (serverless
Postgres) accessed through Vercel serverless functions in `/api`, deployed free
on Vercel. Voice input via the browser-native Web Speech API.

> The original spec used Supabase's auto REST API. Neon is plain Postgres with
> no built-in API, so this project adds a thin serverless API layer (`/api/*`)
> that talks to Neon with `@neondatabase/serverless`. The frontend never sees
> the database URL.

## 1. Create the Neon database

1. Sign up at https://neon.tech (free tier) and create a project.
2. Copy the **pooled** connection string from *Connection Details*
   (looks like `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
3. Put it in `.env` (copy from `.env.example`):
   ```
   DATABASE_URL=postgresql://...
   ```

## 2. Create tables + seed employees

Either run the helper script:

```bash
npm install
npm run db:setup -- --seed     # runs db/schema.sql then db/seed.sql
```

…or paste `db/schema.sql` and `db/seed.sql` into the Neon **SQL Editor**.

Edit `db/seed.sql` first with the real employee names (exactly one `admin`).

## 3. Run locally

The API functions run under Vercel's dev server; the frontend runs under Vite.

```bash
npm install -g vercel      # once
vercel dev                 # serves /api on :3000
npm run dev                # Vite on :5173, proxies /api -> :3000
```

Open http://localhost:5173.

## 4. Deploy free on Vercel

1. Push this repo to GitHub, import it in Vercel.
2. In Vercel project **Settings → Environment Variables**, add `DATABASE_URL`
   with your Neon pooled string.
3. Deploy. Vercel auto-detects Vite and builds `/api` as serverless functions.
4. iPhone: Safari → Share → **Add to Home Screen**.
   Android: Chrome → menu → **Install app**.

## Database schema

See `db/schema.sql`. Tables: `employees`, `customers`, `loans`, `entries`.

## Calculations

- `total_to_receive = amount_given + interest_amount`
- `installment_count`: daily→`tenure_days`, weekly→`⌈days/7⌉`,
  monthly→`⌈days/30⌉`, yearly→`⌈days/365⌉`
- `installment_amount = total_to_receive / installment_count`
- `balance_remaining = total_to_receive − Σ entries.amount`

A loan auto-closes once collected ≥ total_to_receive.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/employees` | name-select list |
| GET/POST | `/api/customers` | list/search/detail/create |
| GET/POST | `/api/loans` | loans per customer / create |
| GET/POST | `/api/entries` | today's or dated collections / create |
| GET | `/api/summary` | today/week/month totals |

`employee_id` query param scopes results to one employee (staff always see only
their own; admin can pass it via the "All / [name]" filter).
