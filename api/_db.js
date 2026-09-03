import { neon } from '@neondatabase/serverless'

// Neon's serverless (HTTP) driver — fast for serverless: one round trip per
// query, no TCP/TLS connection setup, no pooling to manage.
let _client
function client() {
  if (!_client) _client = neon(process.env.DATABASE_URL)
  return _client
}

// Create tables + seed logins on a brand-new/empty database. Split into single
// statements (the HTTP driver runs one statement per call). Only runs when the
// members table is missing, so it's a no-op after the first time.
const INIT_STATEMENTS = [
  `create table if not exists members (
     id uuid primary key default gen_random_uuid(),
     username text not null unique, name text not null,
     role text not null default 'member' check (role in ('admin','member')),
     pin text unique, created_at timestamptz not null default now())`,
  `create table if not exists customers (
     id uuid primary key default gen_random_uuid(),
     name text not null, phone text, address text,
     added_by uuid references members(id), created_at timestamptz not null default now())`,
  `create table if not exists loans (
     id uuid primary key default gen_random_uuid(),
     customer_id uuid not null references customers(id) on delete cascade,
     amount_given numeric not null, interest_amount numeric not null default 0,
     total_to_receive numeric not null, tenure_days integer not null,
     frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
     installment_count integer not null, installment_amount numeric not null,
     start_date date not null default current_date,
     status text not null default 'active' check (status in ('active','closed')),
     created_by uuid references members(id), created_at timestamptz not null default now())`,
  `create table if not exists entries (
     id uuid primary key default gen_random_uuid(),
     loan_id uuid not null references loans(id) on delete cascade,
     customer_id uuid not null references customers(id) on delete cascade,
     member_id uuid references members(id), amount numeric not null,
     entry_date date not null default current_date, note text,
     created_at timestamptz not null default now())`,
  `create index if not exists idx_loans_customer on loans(customer_id)`,
  `create index if not exists idx_entries_loan on entries(loan_id)`,
  `create index if not exists idx_entries_customer on entries(customer_id)`,
  `create index if not exists idx_entries_date on entries(entry_date)`,
  `create index if not exists idx_entries_member on entries(member_id)`,
  `insert into members (username, name, role, pin) values
     ('sailesh','Sailesh','admin','2904'), ('sarath','Sarath','member','0000')
   on conflict (username) do nothing`
]

let ready
function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const c = client()
      try {
        await c`select 1 from members limit 1` // fast existence check
      } catch {
        for (const stmt of INIT_STATEMENTS) await c.query(stmt)
      }
    })().catch((e) => { ready = null; throw e })
  }
  return ready
}

// Tagged-template `sql` used by the endpoints: await sql`... ${x} ...`
export function sql(strings, ...values) {
  return ensureReady().then(() => client()(strings, ...values))
}

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json')
  res.status(status).json(body)
}

export function istStart(range) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const todayStr = fmt.format(new Date())
  if (range === 'all') return '1970-01-01'
  if (range === 'week') {
    const [y, m, d] = todayStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const dow = dt.getUTCDay()
    dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    return dt.toISOString().slice(0, 10)
  }
  if (range === 'month') return todayStr.slice(0, 7) + '-01'
  return todayStr
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
